package com.nook.notifications

import android.content.ComponentName
import android.content.Context
import android.content.Intent
import android.net.Uri
import android.os.Build
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
  }
}
