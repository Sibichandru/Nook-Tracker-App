/**
 * Drives the pending-review reminder off the app lifecycle.
 *
 * Scheduling happens when the app leaves the foreground and cancelling when it
 * returns, which means the reminder can only ever fire while the user is away —
 * exactly the behaviour we want, and achieved without any background execution.
 *
 * Mounted alongside the notification drainer in app/_layout.tsx, inside the
 * hydration gate so `expenses` is populated before we count it.
 */

import { useEffect, useRef } from 'react';
import { AppState, type AppStateStatus, Platform } from 'react-native';

import { useStore } from '@/lib/store';

import {
  cancelPendingReminder,
  schedulePendingReminder,
} from './reminder';

/** Rows the user still has to confirm or reject. */
export function countPendingExpenses(
  expenses: { status: string }[],
): number {
  return expenses.filter((e) => e.status === 'pending').length;
}

export function usePendingReminder() {
  const enabled = useStore((s) => s.settings.pendingReminderEnabled);

  // Read the expense list through a ref rather than as an effect dependency:
  // it changes on every edit, and re-subscribing AppState on each keystroke of
  // an expense edit would be wasteful. We only need its value at the moment the
  // app backgrounds.
  const expenses = useStore((s) => s.expenses);
  const expensesRef = useRef(expenses);
  expensesRef.current = expenses;

  useEffect(() => {
    if (Platform.OS !== 'android') return;

    if (!enabled) {
      // Turning the setting off must clear anything already queued, or a
      // reminder the user just opted out of still arrives hours later.
      void cancelPendingReminder();
      return;
    }

    const handle = (state: AppStateStatus) => {
      if (state === 'active') {
        void cancelPendingReminder();
        return;
      }
      if (state === 'background') {
        void schedulePendingReminder(
          countPendingExpenses(expensesRef.current),
        );
      }
    };

    // The app is in the foreground as this mounts, so clear any reminder left
    // over from the previous session.
    void cancelPendingReminder();

    const sub = AppState.addEventListener('change', handle);
    return () => sub.remove();
  }, [enabled]);
}
