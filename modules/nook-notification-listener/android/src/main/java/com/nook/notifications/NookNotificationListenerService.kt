package com.nook.notifications

import android.app.Notification
import android.service.notification.NotificationListenerService
import android.service.notification.StatusBarNotification
import android.util.Log
import org.json.JSONObject
import java.io.File
import java.io.FileOutputStream

/**
 * Captures notifications from allowlisted banking/payment apps and appends a
 * single JSON object per line to `<filesDir>/pending-notifications.jsonl`.
 *
 * The JS side drains this file on app foreground (iter 34). We deliberately
 * keep this service dumb — no parsing, no SQLite, no IPC. Java-side allowlist
 * filtering is the one piece of intelligence here because it drops the vast
 * majority of unrelated notifications before any disk write happens.
 *
 * The allowlist below MUST stay in sync with lib/notifications/allowlist.ts.
 * They're duplicated because the service can't reach JS state at the moment
 * a notification posts, and we don't want to ship every unrelated string to
 * the queue just to filter it later.
 */
class NookNotificationListenerService : NotificationListenerService() {
  companion object {
    private const val TAG = "NookListener"
    private const val QUEUE_FILENAME = "pending-notifications.jsonl"

    private val LOCK = Any()

    private val ALLOWED_PACKAGES = setOf(
      "com.phonepe.app",
      "com.google.android.apps.nbu.paisa.user",
      "net.one97.paytm",
      "in.org.npci.upiapp",
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

  override fun onNotificationPosted(sbn: StatusBarNotification?) {
    val notification = sbn ?: return
    val pkg = notification.packageName ?: return
    if (pkg !in ALLOWED_PACKAGES) return

    val extras = notification.notification?.extras ?: return
    val title = extras.getString(Notification.EXTRA_TITLE) ?: ""
    val body = extras.getCharSequence(Notification.EXTRA_TEXT)?.toString() ?: ""
    if (body.isBlank()) return

    val line = try {
      JSONObject().apply {
        put("packageName", pkg)
        put("title", title)
        put("body", body)
        put("postTime", notification.postTime)
      }.toString()
    } catch (e: Exception) {
      Log.e(TAG, "Failed to encode notification JSON", e)
      return
    }

    synchronized(LOCK) {
      try {
        FileOutputStream(File(filesDir, QUEUE_FILENAME), true).use { os ->
          os.write((line + "\n").toByteArray(Charsets.UTF_8))
        }
      } catch (e: Exception) {
        Log.e(TAG, "Failed to append notification to queue", e)
      }
    }
  }

  override fun onListenerConnected() {
    Log.d(TAG, "Notification listener connected")
  }

  override fun onListenerDisconnected() {
    Log.d(TAG, "Notification listener disconnected")
  }
}
