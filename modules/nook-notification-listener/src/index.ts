import { Platform } from 'react-native';

import NookNotificationListenerModule from './NookNotificationListenerModule';

/**
 * Whether the user has granted Notification Access to Nook in system
 * settings. Cheap synchronous lookup — safe to call from render.
 *
 * Always false on non-Android platforms; iOS has no equivalent surface and
 * this module is Android-only.
 */
export function isPermissionGranted(): boolean {
  if (Platform.OS !== 'android') return false;
  return NookNotificationListenerModule.isPermissionGranted();
}

/**
 * Launches Android's Notification Access settings screen so the user can
 * flip Nook's toggle on. No-op on platforms that don't expose the screen.
 */
export function openPermissionSettings(): void {
  if (Platform.OS !== 'android') return;
  NookNotificationListenerModule.openPermissionSettings();
}

/**
 * Absolute path to the JSONL queue the native service writes to. The JS
 * drain reads from exactly this path so we don't drift if Android's
 * filesDir convention shifts under us.
 */
export function getQueuePath(): string {
  if (Platform.OS !== 'android') return '';
  return NookNotificationListenerModule.getQueuePath();
}
