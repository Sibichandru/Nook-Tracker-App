/**
 * Gathers everything known about the notification capture pipeline into one
 * snapshot, and formats it for sharing.
 *
 * Two screens consume this: the user-facing capture screen
 * (`app/(app)/notification-apps.tsx`), which renders the health summary and the
 * app picker, and the dev inspector (`app/dev/notifications.tsx`), which dumps
 * the raw files. Keeping collection here means the two can't drift on what
 * "connected" or "healthy" means.
 *
 * Not node-pure (it touches the filesystem and the native module), so it must
 * stay out of anything the smoke runner imports.
 */

import * as FileSystem from 'expo-file-system/legacy';

import {
  getAllowlistPath,
  getDebugLogPath,
  getManufacturer,
  getQueuePath,
  isIgnoringBatteryOptimizations,
  isListenerConnected,
  isPermissionGranted,
} from 'nook-notification-listener';

import { getRejectsUri } from './drain';
import {
  extractSeenPackages,
  summarizeListenerLog,
  type ListenerHealth,
} from './health';

export type FileRead = {
  /** Display text — either the file body, a placeholder, or an error string. */
  contents: string;
  size: number;
  /** True when `contents` is a placeholder/error rather than real file data. */
  placeholder: boolean;
};

export type DiagnosticsSnapshot = {
  granted: boolean;
  connected: boolean;
  batteryExempt: boolean;
  manufacturer: string;
  queuePath: string;
  debugLogPath: string;
  allowlistPath: string;
  queue: FileRead;
  debugLog: FileRead;
  allowlist: FileRead;
  rejects: FileRead;
  health: ListenerHealth;
  /** Packages the listener saw and dropped as not-allowlisted, newest first. */
  seenPackages: string[];
};

export async function readDiagnosticsFile(
  path: string,
  emptyLabel: string,
): Promise<FileRead> {
  if (!path) return { contents: '(unavailable)', size: 0, placeholder: true };
  const fileUri = path.startsWith('file://') ? path : `file://${path}`;
  try {
    const info = await FileSystem.getInfoAsync(fileUri);
    if (!info.exists) {
      return { contents: emptyLabel, size: 0, placeholder: true };
    }
    const contents = await FileSystem.readAsStringAsync(fileUri, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    if (contents.length === 0) {
      return { contents: '(empty)', size: 0, placeholder: true };
    }
    return { contents, size: info.size ?? 0, placeholder: false };
  } catch (e) {
    return {
      contents: `Error reading file: ${e instanceof Error ? e.message : String(e)}`,
      size: 0,
      placeholder: true,
    };
  }
}

export async function collectDiagnostics(): Promise<DiagnosticsSnapshot> {
  const queuePath = getQueuePath();
  const debugLogPath = getDebugLogPath();
  const allowlistPath = getAllowlistPath();
  const rejectsUri = getRejectsUri();

  const [queue, debugLog, allowlist, rejects] = await Promise.all([
    readDiagnosticsFile(
      queuePath,
      '(file does not exist yet — no notifications captured)',
    ),
    readDiagnosticsFile(
      debugLogPath,
      '(file does not exist yet — service has never fired)',
    ),
    readDiagnosticsFile(
      allowlistPath,
      '(not written yet — service is using its baseline allowlist)',
    ),
    readDiagnosticsFile(
      rejectsUri ?? '',
      '(none — every captured line parsed cleanly)',
    ),
  ]);

  // Health and package discovery must parse real log text, never a placeholder.
  const rawLog = debugLog.placeholder ? '' : debugLog.contents;

  return {
    granted: isPermissionGranted(),
    connected: isListenerConnected(),
    batteryExempt: isIgnoringBatteryOptimizations(),
    manufacturer: getManufacturer(),
    queuePath,
    debugLogPath,
    allowlistPath,
    queue,
    debugLog,
    allowlist,
    rejects,
    health: summarizeListenerLog(rawLog),
    seenPackages: extractSeenPackages(rawLog),
  };
}

/**
 * One shareable text bundle. Includes the device and permission context, not
 * just the log — a log without "which phone, was it bound, was it battery
 * exempt" is rarely enough to diagnose an OEM-specific capture failure.
 */
export function buildDiagnosticsReport(snap: DiagnosticsSnapshot): string {
  return [
    `device: ${snap.manufacturer || '(unknown)'}`,
    `permissionGranted: ${snap.granted}`,
    `listenerConnected: ${snap.connected}`,
    `batteryExempt: ${snap.batteryExempt}`,
    `health: ${snap.health.status}`,
    `lastConnectedAt: ${snap.health.lastConnectedAt ?? '(never)'}`,
    `lastAcceptedAt: ${snap.health.lastAcceptedAt ?? '(never)'}`,
    `logRolled: ${snap.health.rolled}`,
    `queueSize: ${snap.queue.size} bytes`,
    '',
    '--- allowlist (on disk) ---',
    snap.allowlist.contents,
    '',
    '--- queue (JSONL) ---',
    snap.queue.contents,
    '',
    '--- parse rejects ---',
    snap.rejects.contents,
    '',
    '--- listener debug log ---',
    snap.debugLog.contents,
  ].join('\n');
}
