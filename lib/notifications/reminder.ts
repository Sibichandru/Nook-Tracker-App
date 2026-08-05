/**
 * Reminds the user about auto-captured expenses still awaiting review.
 *
 * Design constraint that shapes everything here: **no background execution.**
 * The app already fought OEM battery managers to keep a NotificationListener
 * alive (see modules/nook-notification-listener), and a background task to
 * count pending rows would lose that same fight on the same devices. So the
 * reminder is scheduled ahead of time, from the foreground, with its content
 * baked in at schedule time:
 *
 *   - On backgrounding with pending rows → schedule one notification 8h out.
 *   - On foregrounding → cancel it, because the user is looking at the tray.
 *
 * The consequence, accepted deliberately: the count in the notification is a
 * snapshot from when the app was last closed, and the user gets one nudge per
 * app session rather than a repeating drumbeat. That is the intended behaviour
 * — the point is a gentle reminder, not nagging.
 */

import * as Notifications from 'expo-notifications';
import { Platform } from 'react-native';

/** Hours between leaving pending items and being reminded about them. */
export const REMINDER_DELAY_HOURS = 8;

const REMINDER_IDENTIFIER = 'nook-pending-review';
const ANDROID_CHANNEL_ID = 'pending-review';

/**
 * Android requires a channel before anything can be posted, and its importance
 * is fixed at creation — changing it later in code is ignored once the channel
 * exists on device. DEFAULT deliberately: this should appear quietly in the
 * shade, not interrupt with a heads-up banner.
 */
export async function ensureReminderChannel(): Promise<void> {
  if (Platform.OS !== 'android') return;
  await Notifications.setNotificationChannelAsync(ANDROID_CHANNEL_ID, {
    name: 'Pending review',
    importance: Notifications.AndroidImportance.DEFAULT,
    sound: null,
    vibrationPattern: [0, 200],
    showBadge: true,
  });
}

/**
 * Requests POST_NOTIFICATIONS (Android 13+). Returns whether we may post.
 * Call this when the user turns the setting on, not at launch — an unexplained
 * permission dialog on first run is the fastest way to get denied forever.
 */
export async function requestReminderPermission(): Promise<boolean> {
  const existing = await Notifications.getPermissionsAsync();
  if (existing.granted) return true;
  // canAskAgain false means the user has hard-denied; asking again is a no-op
  // that silently resolves to denied, so report it rather than pretending.
  if (!existing.canAskAgain) return false;
  const next = await Notifications.requestPermissionsAsync();
  return next.granted;
}

export async function hasReminderPermission(): Promise<boolean> {
  const status = await Notifications.getPermissionsAsync();
  return status.granted;
}

function reminderBody(count: number): string {
  return count === 1
    ? '1 captured expense is waiting for you to confirm or reject it.'
    : `${count} captured expenses are waiting for you to confirm or reject them.`;
}

/** Removes any scheduled reminder. Safe to call when none exists. */
export async function cancelPendingReminder(): Promise<void> {
  try {
    await Notifications.cancelScheduledNotificationAsync(REMINDER_IDENTIFIER);
  } catch {
    // Throws when nothing is scheduled under this identifier on some platforms.
  }
}

/**
 * Schedules the single reminder, replacing any previously scheduled one.
 * No-ops when there is nothing pending, when permission is missing, or off
 * Android — the caller doesn't have to pre-check any of that.
 */
export async function schedulePendingReminder(
  pendingCount: number,
): Promise<boolean> {
  if (Platform.OS !== 'android') return false;

  // Always clear first: the count is baked into the body, so a stale
  // notification would otherwise survive and report the wrong number.
  await cancelPendingReminder();

  if (pendingCount <= 0) return false;
  if (!(await hasReminderPermission())) return false;

  await ensureReminderChannel();

  try {
    await Notifications.scheduleNotificationAsync({
      identifier: REMINDER_IDENTIFIER,
      content: {
        title: 'Expenses waiting for review',
        body: reminderBody(pendingCount),
        // Routed by app/_layout.tsx's response listener.
        data: { route: '/dashboard' },
      },
      trigger: {
        type: Notifications.SchedulableTriggerInputTypes.TIME_INTERVAL,
        seconds: REMINDER_DELAY_HOURS * 60 * 60,
        repeats: false,
        channelId: ANDROID_CHANNEL_ID,
      },
    });
    return true;
  } catch {
    // A failed reminder must never break app lifecycle handling.
    return false;
  }
}
