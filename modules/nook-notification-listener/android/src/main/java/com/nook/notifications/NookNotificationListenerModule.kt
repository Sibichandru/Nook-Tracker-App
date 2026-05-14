package com.nook.notifications

import android.content.ComponentName
import android.content.Context
import android.content.Intent
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

    Function("getQueuePath") {
      File(context.filesDir, "pending-notifications.jsonl").absolutePath
    }
  }
}
