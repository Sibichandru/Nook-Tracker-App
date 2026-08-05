package com.nook.notifications

import android.app.Notification
import android.content.ComponentName
import android.content.Context
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONArray
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream
import java.text.SimpleDateFormat
import java.util.Date
import java.util.Locale
import java.util.TimeZone

/**
 * Captures notifications from allowlisted banking/payment apps and appends a
 * single JSON object per line to `<filesDir>/pending-notifications.jsonl`.
 *
 * Also writes every event (connected, disconnected, every received notification
 * with its allowlist decision) to `<filesDir>/listener-debug.log`. That file is
 * surfaced in the dev screen so the user can see live capture activity without
 * plugging into a laptop for `adb logcat`.
 *
 * The JS side drains the JSONL queue on app foreground (iter 34). We deliberately
 * keep this service dumb — no parsing, no SQLite, no IPC. Java-side allowlist
 * filtering is the one piece of intelligence here because it drops the vast
 * majority of unrelated notifications before any disk write happens.
 *
 * Allowlist source of truth:
 *   - JS writes `<filesDir>/allowlist.json` at app launch (a JSON array of
 *     package strings)
 *   - This service reads that file with mtime-based cache invalidation. New
 *     packages added in JS take effect on the very next notification.
 *   - {@link BUILTIN_ALLOWLIST} below is the fallback used until JS has written
 *     the file (first launch, between rebuild and first JS load, etc.).
 */
class NookNotificationListenerService : NotificationListenerService() {
  companion object {
    private const val TAG = "NookListener"
    private const val QUEUE_FILENAME = "pending-notifications.jsonl"
    private const val DEBUG_LOG_FILENAME = "listener-debug.log"
    private const val ALLOWLIST_FILENAME = "allowlist.json"
    private const val MAX_DEBUG_LOG_BYTES = 64 * 1024 // 64 KB rolling cap

    private val QUEUE_LOCK = Any()
    private val DEBUG_LOCK = Any()
    private val ALLOWLIST_LOCK = Any()

    /**
     * Whether Android currently has us bound. Read from the JS bridge so the
     * app can tell "permission granted" (a Settings.Secure row) apart from
     * "actually receiving notifications" — on aggressive OEM ROMs the first can
     * be true while the second is false, which is the whole reason capture
     * silently dies on some devices.
     */
    @Volatile
    var isConnected: Boolean = false
      private set

    /**
     * Packages we've already logged a `not_allowlisted` line for this service
     * lifetime. Without this, every notification on the device writes a line
     * and the 64 KB rolling cap erases the CONNECTED/DISCONNECTED history —
     * the exact evidence needed to diagnose a dead listener. First sighting per
     * package still gets logged, so package discovery is unaffected.
     */
    private val loggedUnknownPackages = java.util.Collections.newSetFromMap(
      java.util.concurrent.ConcurrentHashMap<String, Boolean>()
    )

    /**
     * Asks Android to re-bind the listener. Safe to call when already bound —
     * the platform ignores a redundant request. Called from JS on foreground
     * whenever permission is granted but {@link isConnected} is false.
     *
     * Named `rebind` rather than `requestRebind` on purpose: an unqualified
     * `requestRebind(...)` inside this companion would resolve to itself and
     * recurse instead of reaching the platform static.
     */
    fun rebind(context: Context) {
      NotificationListenerService.requestRebind(
        ComponentName(context, NookNotificationListenerService::class.java)
      )
    }

    /**
     * Hardcoded baseline used until JS writes its preferred set to disk. Kept
     * in sync with lib/notifications/allowlist.ts so first-launch behaviour
     * matches what the JS-managed allowlist will set on the next foreground.
     */
    private val BUILTIN_ALLOWLIST = setOf(
      "com.phonepe.app",
      "com.google.android.apps.nbu.paisa.user",
      "net.one97.paytm",
      "in.org.npci.upiapp",
      "com.dreamplug.androidapp",
      "com.cred.app",
      "com.amazon.mShop.android.shopping",
      "com.csam.icici.bank.imobile",
      "com.snapwork.hdfc",
      "com.sbi.SBIFreedomPlus",
      "com.axis.mobile",
      "com.kotak.bank.android",
      "com.idfcfirstbank.optimus",
      "com.americanexpress.android.acctsvcs.in",
      "com.sbicard.epay"
    )
  }

  private val timestampFormatter by lazy {
    SimpleDateFormat("yyyy-MM-dd'T'HH:mm:ss.SSS'Z'", Locale.US).apply {
      timeZone = TimeZone.getTimeZone("UTC")
    }
  }

  // Cache invalidated by file mtime — hot path is one mtime check + a set lookup.
  @Volatile private var cachedAllowlist: Set<String>? = null
  @Volatile private var cachedAllowlistMtime: Long = -1L

  /**
   * Returns the current allowlist. Reads `<filesDir>/allowlist.json` once and
   * caches the parsed set; reloads only when the file's lastModified changes.
   * Falls back to {@link BUILTIN_ALLOWLIST} when the file is missing or
   * corrupt so the service is never gated by a JS-side bug.
   */
  private fun currentAllowlist(): Set<String> {
    val file = File(filesDir, ALLOWLIST_FILENAME)
    if (!file.exists()) {
      // Reset the cache so re-creation of the file is picked up immediately.
      if (cachedAllowlist != null) {
        synchronized(ALLOWLIST_LOCK) {
          cachedAllowlist = null
          cachedAllowlistMtime = -1L
        }
      }
      return BUILTIN_ALLOWLIST
    }
    val mtime = file.lastModified()
    val cached = cachedAllowlist
    if (cached != null && mtime == cachedAllowlistMtime) return cached

    return synchronized(ALLOWLIST_LOCK) {
      // Re-check under lock in case another thread populated the cache.
      val recheck = cachedAllowlist
      if (recheck != null && mtime == cachedAllowlistMtime) return@synchronized recheck

      try {
        val text = file.readText(Charsets.UTF_8)
        val arr = JSONArray(text)
        val pkgs = mutableSetOf<String>()
        for (i in 0 until arr.length()) {
          val pkg = arr.optString(i, null)
          if (!pkg.isNullOrBlank()) pkgs.add(pkg)
        }
        if (pkgs.isEmpty()) {
          // Empty array would silently disable capture — prefer the baseline
          // to a fully-deaf service.
          Log.w(TAG, "allowlist.json parsed to empty set; falling back to baseline")
          cachedAllowlist = BUILTIN_ALLOWLIST
        } else {
          cachedAllowlist = pkgs
        }
        cachedAllowlistMtime = mtime
        cachedAllowlist!!
      } catch (e: Exception) {
        Log.e(TAG, "Failed to parse allowlist.json; falling back to baseline", e)
        cachedAllowlist = BUILTIN_ALLOWLIST
        cachedAllowlistMtime = mtime
        BUILTIN_ALLOWLIST
      }
    }
  }

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val notification = sbn ?: run {
      appendDebugLog("POSTED sbn=null")
      return
    }
    val pkg = notification.packageName ?: run {
      appendDebugLog("POSTED pkg=null")
      return
    }

    if (pkg !in currentAllowlist()) {
      // Log only the first sighting per package — see loggedUnknownPackages.
      if (loggedUnknownPackages.add(pkg)) {
        appendDebugLog("POSTED pkg=$pkg decision=dropped reason=not_allowlisted")
      }
      return
    }

    val extras = notification.notification?.extras
    if (extras == null) {
      appendDebugLog("POSTED pkg=$pkg decision=dropped reason=no_extras")
      return
    }

    val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
    val body = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
    if (body.isBlank()) {
      appendDebugLog("POSTED pkg=$pkg decision=dropped reason=blank_body title=${title.take(40)}")
      return
    }

    val line = try {
      JSONObject().apply {
        put("packageName", pkg)
        put("title", title)
        put("body", body)
        put("postTime", notification.postTime)
      }.toString()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to encode notification JSON", e)
      appendDebugLog("POSTED pkg=$pkg decision=dropped reason=json_error error=${e.message}")
      return
    }

    val accepted = synchronized(QUEUE_LOCK) {
      try {
        FileOutputStream(File(filesDir, QUEUE_FILENAME), true).use { os ->
          os.write((line + "\n").toByteArray(Charsets.UTF_8))
        }
        true
      } catch (e: Exception) {
        Log.e(TAG, "Failed to append notification to queue", e)
        appendDebugLog("POSTED pkg=$pkg decision=dropped reason=write_error error=${e.message}")
        false
      }
    }

    if (accepted) {
      appendDebugLog("POSTED pkg=$pkg decision=accepted title=${title.take(40)}")
    }
  }

  override fun onListenerConnected() {
    Log.d(TAG, "Notification listener connected")
    isConnected = true
    // A fresh binding means a fresh process in most cases, but not always
    // (Android can rebind without tearing us down). Clear the throttle so the
    // first notification from each package after a reconnect is logged again.
    loggedUnknownPackages.clear()
    val size = currentAllowlist().size
    appendDebugLog("CONNECTED allowlist_size=$size")
  }

  /**
   * Android drops the binding on low memory, app updates, and — most relevant
   * here — OEM battery managers. Without asking for it back, capture stops
   * permanently until the user manually toggles Notification Access. That is
   * the failure mode behind "it worked on my other phone".
   */
  override fun onListenerDisconnected() {
    Log.d(TAG, "Notification listener disconnected")
    isConnected = false
    val requested = try {
      rebind(this)
      true
    } catch (e: Exception) {
      Log.e(TAG, "requestRebind failed", e)
      false
    }
    appendDebugLog("DISCONNECTED requested_rebind=${if (requested) 1 else 0}")
  }

  /**
   * Appends a single timestamped line to the debug log, with a rolling size
   * cap so a chatty notification source can't grow the file unbounded. When
   * the file crosses the cap, it's truncated and the new line restarts it.
   */
  private fun appendDebugLog(message: String) {
    val timestamp = timestampFormatter.format(Date())
    val line = "$timestamp $message\n"
    synchronized(DEBUG_LOCK) {
      try {
        val file = File(filesDir, DEBUG_LOG_FILENAME)
        if (file.exists() && file.length() > MAX_DEBUG_LOG_BYTES) {
          file.writeText("$timestamp [LOG_ROLLED]\n")
        }
        FileOutputStream(file, true).use { os ->
          os.write(line.toByteArray(Charsets.UTF_8))
        }
      } catch (e: Exception) {
        Log.e(TAG, "Failed to append debug log", e)
      }
    }
  }
}
