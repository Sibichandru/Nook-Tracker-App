/**
 * Drains the notification capture queue when the app comes to the foreground
 * (and once on mount, in case captures arrived while the app was killed).
 *
 * Mounted inside the hydration gate so the store is always ready when we
 * start inserting pending rows.
 *
 * Gated on `settings.notificationCaptureEnabled` — the user must explicitly
 * opt in from Settings. When the flag is off, this is a complete no-op: no
 * allowlist sync, no queue read, no DB writes. When it flips on we run an
 * immediate drain so newly-opt-in users see any captures the native service
 * may have accumulated while permission was granted but capture was off.
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import {
  isListenerConnected,
  isPermissionGranted,
  requestRebind,
} from 'nook-notification-listener';

import { useStore } from '@/lib/store';

import { drainNotificationQueue } from './drain';
import { syncAllowlist } from './syncAllowlist';

export function useDrainOnForeground() {
  const enabled = useStore((s) => s.settings.notificationCaptureEnabled);
  // Coalesce overlapping drains so a quick background/foreground bounce
  // doesn't fire two passes that race on the same JSONL file.
  const inFlight = useRef<Promise<unknown> | null>(null);

  useEffect(() => {
    if (Platform.OS !== 'android') return;
    if (!enabled) return;

    // Repair a listener the system dropped while we were backgrounded. On OEM
    // ROMs that kill background services the permission stays granted but the
    // binding is gone, and nothing re-establishes it on its own — so capture
    // stays silently dead until the user re-toggles Notification Access.
    // Asking for a rebind is free when we're already connected.
    const repairListener = () => {
      try {
        if (isPermissionGranted() && !isListenerConnected()) {
          requestRebind();
        }
      } catch {
        // Never let a diagnostic call break the drain path.
      }
    };

    const runDrain = () => {
      if (inFlight.current) return;
      repairListener();
      // Sync the allowlist before draining so any newly-added bank packages
      // are honored by the native service on the very next notification.
      // syncAllowlist is idempotent — a no-op when the on-disk list already
      // matches JS, so this is cheap on the hot path.
      inFlight.current = syncAllowlist()
        .catch(() => {
          // Allowlist sync is best-effort; the native side falls back to its
          // built-in baseline if the file isn't present.
        })
        .then(() => drainNotificationQueue())
        .catch(() => {
          // Drain failures swallow silently; the queue is preserved on disk
          // and retried on the next foreground.
        })
        .finally(() => {
          inFlight.current = null;
        });
    };

    runDrain();

    const sub = AppState.addEventListener(
      'change',
      (state: AppStateStatus) => {
        if (state === 'active') runDrain();
      },
    );

    return () => sub.remove();
  }, [enabled]);
}
