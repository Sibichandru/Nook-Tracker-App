import { Platform } from 'react-native';

import NookNotificationListenerModule from './NookNotificationListenerModule';

/**
 * The native module is keyed by name and registered at app startup. When the
 * JS bundle adds a new method but the APK was built before that method
 * existed, calling it would throw "undefined is not a function" mid-render.
 * Wrap each call with a function-existence check so an out-of-date APK
 * gracefully degrades to a sensible default instead of crashing the screen.
 */
function callNative<T>(
  method: keyof typeof NookNotificationListenerModule,
  fallback: T,
): T {
  const fn = NookNotificationListenerModule[method] as unknown;
  if (typeof fn !== 'function') return fallback;
  try {
    return (fn as () => T).call(NookNotificationListenerModule);
  } catch {
    return fallback;
  }
}

/**
 * Whether the user has granted Notification Access to Nook in system
 * settings. Cheap synchronous lookup — safe to call from render.
 *
 * Always false on non-Android platforms; iOS has no equivalent surface and
 * this module is Android-only.
 */
export function isPermissionGranted(): boolean {
  if (Platform.OS !== 'android') return false;
  return callNative('isPermissionGranted', false);
}

/**
 * Launches Android's Notification Access settings screen so the user can
 * flip Nook's toggle on. No-op on platforms that don't expose the screen.
 */
export function openPermissionSettings(): void {
  if (Platform.OS !== 'android') return;
  callNative('openPermissionSettings', undefined);
}

/**
 * Launches this app's "App Info" page in system Settings. Sideloaded users
 * have to open it once to flip "Allow restricted settings" before the
 * Notification Access toggle becomes usable on Android 13+.
 */
export function openAppDetailsSettings(): void {
  if (Platform.OS !== 'android') return;
  callNative('openAppDetailsSettings', undefined);
}

/**
 * Package name of whoever installed Nook (e.g. `com.android.vending` for
 * Play Store). Used to decide whether the user needs the "Allow restricted
 * settings" step in the setup card.
 *
 * Returns '' on non-Android, on APKs that predate this method, or when the
 * installer is unknown.
 */
export function getInstallerPackageName(): string {
  if (Platform.OS !== 'android') return '';
  return callNative('getInstallerPackageName', '');
}

/**
 * Absolute path to the JSONL queue the native service writes to. The JS
 * drain reads from exactly this path so we don't drift if Android's
 * filesDir convention shifts under us.
 */
export function getQueuePath(): string {
  if (Platform.OS !== 'android') return '';
  return callNative('getQueuePath', '');
}

/**
 * Absolute path to the listener's debug log. Each line is a single timestamped
 * event written by the native service: `CONNECTED`, `DISCONNECTED`, and one
 * line per `onNotificationPosted` call recording the package name and the
 * allowlist decision. The dev screen tails this so live capture activity is
 * visible without an ADB session.
 *
 * Returns '' on APKs that predate the debug log (iter 34 mid-point) so
 * old builds with new JS keep rendering instead of crashing.
 */
export function getDebugLogPath(): string {
  if (Platform.OS !== 'android') return '';
  return callNative('getDebugLogPath', '');
}

/**
 * Absolute path to the JSON file the native service consults for its
 * allowlist. JS writes a `string[]` of package names to this path; the
 * service picks up changes on its next notification (cached by mtime).
 *
 * Returns '' on APKs that predate the dynamic allowlist so old builds with
 * new JS degrade silently to the hardcoded baseline on the native side.
 */
export function getAllowlistPath(): string {
  if (Platform.OS !== 'android') return '';
  return callNative('getAllowlistPath', '');
}

/**
 * Whether Android currently has the listener bound — i.e. whether we are
 * actually receiving notifications right now.
 *
 * This is deliberately separate from {@link isPermissionGranted}. On OEM ROMs
 * that aggressively kill background services (MIUI/HyperOS especially) the
 * permission stays granted while the binding is gone, so the user sees "all
 * permissions on" and no captures. Only this call distinguishes the two.
 *
 * Returns false on APKs that predate the method — callers should treat that as
 * "unknown" rather than "broken", since the fallback is indistinguishable from
 * a genuinely dead listener.
 */
export function isListenerConnected(): boolean {
  if (Platform.OS !== 'android') return false;
  return callNative('isListenerConnected', false);
}

/**
 * Asks Android to re-bind a dropped listener. Returns false if the request
 * couldn't be made. Safe to call when already connected.
 */
export function requestRebind(): boolean {
  if (Platform.OS !== 'android') return false;
  return callNative('requestRebind', false);
}

/** `Build.MANUFACTURER`, lowercased by callers as needed. '' when unknown. */
export function getManufacturer(): string {
  if (Platform.OS !== 'android') return '';
  return callNative('getManufacturer', '');
}

/**
 * Whether the app is exempt from battery optimization. Defaults to true on
 * failure or on old APKs so we never nag the user based on a guess.
 */
export function isIgnoringBatteryOptimizations(): boolean {
  if (Platform.OS !== 'android') return true;
  return callNative('isIgnoringBatteryOptimizations', true);
}

/** Opens the system "ignore battery optimizations" confirmation dialog. */
export function requestIgnoreBatteryOptimizations(): boolean {
  if (Platform.OS !== 'android') return false;
  return callNative('requestIgnoreBatteryOptimizations', false);
}

/**
 * Deep-links the OEM autostart manager (MIUI Security Center, ColorOS Safe
 * Center). Falls back to App Info natively when no known activity resolves.
 * Returns true only when a real autostart screen was opened.
 */
export function openAutostartSettings(): boolean {
  if (Platform.OS !== 'android') return false;
  return callNative('openAutostartSettings', false);
}
