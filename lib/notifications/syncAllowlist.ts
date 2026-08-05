/**
 * Writes the current JS-side allowlist ({@link ALLOWED_PACKAGES}) to the
 * native service's allowlist file. The Kotlin side picks up changes by mtime
 * on the next notification — no rebuild needed when packages change.
 *
 * Called once on app launch (from {@link useDrainOnForeground}); also exposed
 * to the dev screen so the user can re-sync manually after editing the JS
 * source and reloading Metro.
 *
 * Idempotent: if the file already contains the same packages we'd write,
 * skip the write so the mtime doesn't change unnecessarily (the native side
 * uses mtime to decide whether to reparse).
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { getAllowlistPath } from 'nook-notification-listener';

import { useStore } from '@/lib/store';

import { ALLOWED_PACKAGES } from './allowlist';

export type SyncAllowlistResult =
  | { status: 'noop'; reason: 'unsupported-platform' | 'no-native-path' | 'already-current' }
  | { status: 'written'; count: number };

export async function syncAllowlist(): Promise<SyncAllowlistResult> {
  if (Platform.OS !== 'android') {
    return { status: 'noop', reason: 'unsupported-platform' };
  }
  const path = getAllowlistPath();
  if (!path) {
    return { status: 'noop', reason: 'no-native-path' };
  }
  const uri = path.startsWith('file://') ? path : `file://${path}`;
  // Built-ins plus the user's own additions. Read from the store at call time
  // rather than taken as a parameter, so every caller (including the foreground
  // drain, whose effect doesn't re-run when the list changes) always writes the
  // current list.
  //
  // Sort so order is deterministic regardless of Set iteration semantics —
  // makes the "already-current" comparison stable.
  const userPackages = useStore.getState().settings.notificationPackages;
  const packages = Array.from(
    new Set([...ALLOWED_PACKAGES, ...userPackages]),
  ).sort();
  const next = JSON.stringify(packages);

  try {
    const info = await FileSystem.getInfoAsync(uri);
    if (info.exists) {
      const existing = await FileSystem.readAsStringAsync(uri, {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (existing === next) {
        return { status: 'noop', reason: 'already-current' };
      }
    }
  } catch {
    // Read failures fall through to the write so a corrupt file gets
    // repaired automatically.
  }

  await FileSystem.writeAsStringAsync(uri, next, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { status: 'written', count: packages.length };
}
