package com.nook.notifications

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
import android.os.PowerManager
import android.provider.Settings
import expo.modules.kotlin.exception.Exceptions
import expo.modules.kotlin.modules.Module
import expo.modules.kotlin.modules.ModuleDefinition
import java.io.File

/**
 * JS bridge for the notification listener service.
 *
 * Surface is intentionally tiny:
 *   - `isPermissionGranted()` — synchronous read of the system's enabled
 *     notification listeners string. The service is only invoked by Android
 *     when this flips true, so the JS layer uses it to render the permission
 *     onboarding card on the dashboard (iter 34).
 *   - `openPermissionSettings()` — launches the system Notification access
 *     settings page; user has to flip our toggle by hand. No way around the
 *     manual grant.
 *   - `getQueuePath()` — returns the absolute path to the JSONL file the
 *     service writes to. Exposed so the JS drain (iter 34) reads from the
 *     same path Kotlin writes to, even if Android's filesDir convention
 *     changes underneath us.
 */
class NookNotificationListenerModule : Module() {
  private val context: Context
    get() = appContext.reactContext ?: throw Exceptions.ReactContextLost()

  override fun definition() = ModuleDefinition {
    Name("NookNotificationListener")

    Function("isPermissionGranted") {
      val component = ComponentName(context, NookNotificationListenerService::class.java)
      val flat = Settings.Secure.getString(
        context.contentResolver,
        "enabled_notification_listeners"
      ) ?: return@Function false
      flat.split(":").any { entry ->
        val parsed = try {
          ComponentName.unflattenFromString(entry)
        } catch (_: Exception) {
          null
        }
        parsed == component
      }
    }

    Function("openPermissionSettings") {
      val intent = Intent(Settings.ACTION_NOTIFICATION_LISTENER_SETTINGS)
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Deep-links to this app's "App Info" screen. Sideloaded users have to
    // visit it once to flip "Allow restricted settings" before Android lets
    // them grant notification access on Android 13+.
    Function("openAppDetailsSettings") {
      val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
        .setData(Uri.fromParts("package", context.packageName, null))
        .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
      context.startActivity(intent)
    }

    // Returns the package name of the app that installed Nook
    // (e.g. "com.android.vending" for Play Store, "com.google.android.packageinstaller"
    // for sideload, "" if unknown). JS uses this to skip the
    // "Allow restricted settings" step for Play Store installs where the
    // restriction doesn't apply.
    Function("getInstallerPackageName") {
      try {
        val pm = context.packageManager
        if (Build.VERSION.SDK_INT >= Build.VERSION_CODES.R) {
          pm.getInstallSourceInfo(context.packageName).installingPackageName ?: ""
        } else {
          @Suppress("DEPRECATION")
          pm.getInstallerPackageName(context.packageName) ?: ""
        }
      } catch (_: Exception) {
        ""
      }
    }

    Function("getQueuePath") {
      File(context.filesDir, "pending-notifications.jsonl").absolutePath
    }

    Function("getDebugLogPath") {
      File(context.filesDir, "listener-debug.log").absolutePath
    }

    Function("getAllowlistPath") {
      File(context.filesDir, "allowlist.json").absolutePath
    }

    // Whether Android currently has the listener service bound. Distinct from
    // isPermissionGranted(): on OEM ROMs that kill background services the
    // permission row survives while the binding does not, which looks to the
    // user like "I granted everything and nothing happens".
    Function("isListenerConnected") {
      NookNotificationListenerService.isConnected
    }

    // Asks Android to re-bind a dropped listener. The repair path for the
    // above — no user interaction, no re-grant needed.
    Function("requestRebind") {
      try {
        NookNotificationListenerService.rebind(context)
        true
      } catch (_: Exception) {
        false
      }
    }

    Function("getManufacturer") {
      Build.MANUFACTURER ?: ""
    }

    // Battery optimization is the usual reason a listener gets killed on
    // Xiaomi/Realme/Oppo builds. Exempting the app is a one-tap system dialog.
    Function("isIgnoringBatteryOptimizations") {
      try {
        val pm = context.getSystemService(Context.POWER_SERVICE) as PowerManager
        pm.isIgnoringBatteryOptimizations(context.packageName)
      } catch (_: Exception) {
        // Treat unknown as "already exempt" so we never nag on a device where
        // we can't actually tell.
        true
      }
    }

    Function("requestIgnoreBatteryOptimizations") {
      try {
        val intent = Intent(Settings.ACTION_REQUEST_IGNORE_BATTERY_OPTIMIZATIONS)
          .setData(Uri.parse("package:${context.packageName}"))
          .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
        context.startActivity(intent)
        true
      } catch (_: Exception) {
        false
      }
    }

    // MIUI/HyperOS Autostart. Without it the listener process is never allowed
    // to start in the background, so capture silently never happens. There is
    // no public API — this deep-links the Security Center activity, whose
    // component name has moved across MIUI versions, hence the fallback.
    Function("openAutostartSettings") {
      val candidates = listOf(
        ComponentName(
          "com.miui.securitycenter",
          "com.miui.permcenter.autostart.AutoStartManagementActivity"
        ),
        ComponentName(
          "com.coloros.safecenter",
          "com.coloros.safecenter.permission.startup.StartupAppListActivity"
        ),
        ComponentName(
          "com.coloros.safecenter",
          "com.coloros.safecenter.startupapp.StartupAppListActivity"
        )
      )
      // Deliberately no resolveActivity() pre-check: on Android 11+ it returns
      // null for packages outside our <queries> visibility even when the
      // activity exists, which would make this always fall through on exactly
      // the devices that need it. Just attempt the launch and catch the
      // ActivityNotFoundException instead.
      val opened = candidates.any { component ->
        try {
          context.startActivity(
            Intent()
              .setComponent(component)
              .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          )
          true
        } catch (_: Exception) {
          false
        }
      }
      if (!opened) {
        // Fall back to App Info — battery and autostart controls are reachable
        // from there on every ROM that has them.
        try {
          val intent = Intent(Settings.ACTION_APPLICATION_DETAILS_SETTINGS)
            .setData(Uri.fromParts("package", context.packageName, null))
            .addFlags(Intent.FLAG_ACTIVITY_NEW_TASK)
          context.startActivity(intent)
        } catch (_: Exception) {
        }
      }
      opened
    }
  }
}
