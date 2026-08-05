/**
 * Reads the JSONL queue the native notification listener (iter 33) writes to,
 * parses each line through {@link parseNotification}, and inserts a `pending`
 * expense row for every successful parse. Truncates the queue after a
 * successful pass so the same notification never gets imported twice.
 *
 * Wired to AppState foreground transitions in `app/_layout.tsx`, plus exposed
 * to the dev screen for manual verification.
 *
 * Dedupe: skips notifications whose (source, date, time, amount) match an
 * existing expense — same physical second + same rupee value is effectively
 * impossible to collide on legitimately.
 */

import * as FileSystem from 'expo-file-system/legacy';
import { Platform } from 'react-native';

import { getQueuePath } from 'nook-notification-listener';

import { useStore } from '@/lib/store';
import type { Expense } from '@/lib/types';

import {
  type NotificationPayload,
  parseNotification,
} from './parser';

export type DrainResult = {
  /** Pending rows inserted into the DB this pass. */
  inserted: number;
  /** Parseable lines that were dropped as duplicates of existing rows. */
  skipped: number;
  /** Lines that failed to JSON-parse or didn't satisfy the parser. */
  invalid: number;
};

const EMPTY_RESULT: DrainResult = { inserted: 0, skipped: 0, invalid: 0 };

/**
 * Rejected lines are written here so "captured but not parsed" is
 * distinguishable from "never captured". Without it the queue is truncated
 * and the evidence is gone: the only symptom is an empty pending tray, which
 * looks identical to a dead listener.
 */
export const REJECTS_FILENAME = 'drain-rejects.jsonl';

/** Keep the reject file small — it's a debugging aid, not an archive. */
const MAX_REJECT_LINES = 50;

export function getRejectsUri(): string | null {
  const dir = FileSystem.documentDirectory;
  return dir ? `${dir}${REJECTS_FILENAME}` : null;
}

/**
 * Overwrites the reject file with this pass's failures. Overwrite rather than
 * append: the user's question is always "why did the payment I just made not
 * show up", so the most recent pass is the only one that matters.
 *
 * Writes even when there are no rejects, so a clean pass clears stale failures
 * instead of leaving the diagnostics screen accusing a bank that now parses
 * fine. Only called when a pass actually had lines to process — a foreground
 * with an empty queue returns earlier and leaves the last real result intact.
 */
async function writeRejects(lines: string[]): Promise<void> {
  const uri = getRejectsUri();
  if (!uri) return;
  try {
    await FileSystem.writeAsStringAsync(
      uri,
      lines.slice(0, MAX_REJECT_LINES).join('\n'),
      { encoding: FileSystem.EncodingType.UTF8 },
    );
  } catch {
    // Diagnostics are best-effort — never fail a drain over them.
  }
}

function isNotificationPayload(v: unknown): v is NotificationPayload {
  if (typeof v !== 'object' || v === null) return false;
  const o = v as Record<string, unknown>;
  return (
    typeof o.packageName === 'string' &&
    typeof o.title === 'string' &&
    typeof o.body === 'string' &&
    typeof o.postTime === 'number'
  );
}

function alreadyImported(
  existing: Expense[],
  candidate: { date: string; time: string; amount: number },
): boolean {
  return existing.some(
    (e) =>
      e.source === 'notification' &&
      e.date === candidate.date &&
      e.time === candidate.time &&
      e.amount === candidate.amount,
  );
}

/**
 * Reads the queue file, processes any captured notifications into pending
 * expenses, then truncates the file. Safe to call repeatedly — a no-op when
 * the file is missing, empty, or the platform doesn't expose a queue path.
 *
 * Race window: between reading the file and truncating it, the native service
 * may append another line; that line gets dropped from the queue but the user
 * still has the OS notification, so the loss is recoverable. Accepted for v1.
 */
export async function drainNotificationQueue(): Promise<DrainResult> {
  if (Platform.OS !== 'android') return EMPTY_RESULT;

  const path = getQueuePath();
  if (!path) return EMPTY_RESULT;

  const fileUri = path.startsWith('file://') ? path : `file://${path}`;

  const info = await FileSystem.getInfoAsync(fileUri);
  if (!info.exists || info.size === 0) return EMPTY_RESULT;

  const contents = await FileSystem.readAsStringAsync(fileUri, {
    encoding: FileSystem.EncodingType.UTF8,
  });

  // Truncate immediately — anything we successfully read is ours to own.
  await FileSystem.writeAsStringAsync(fileUri, '', {
    encoding: FileSystem.EncodingType.UTF8,
  });

  const lines = contents.split('\n').filter((l) => l.trim().length > 0);
  if (lines.length === 0) return EMPTY_RESULT;

  const result: DrainResult = { inserted: 0, skipped: 0, invalid: 0 };
  const rejects: string[] = [];

  // Pull live store handles once — the addExpense action updates state on
  // each call, so re-reading `expenses` between inserts catches any rows we
  // just added in this same drain pass.
  const { addExpense } = useStore.getState();
  // The user's allowlist additions. The native service gates on its own copy in
  // allowlist.json; if this didn't match, a notification would be captured
  // natively and then silently dropped by the parser.
  const extraPackages = useStore.getState().settings.notificationPackages;

  for (const line of lines) {
    let payload: unknown;
    try {
      payload = JSON.parse(line);
    } catch {
      result.invalid += 1;
      rejects.push(`reason=json_parse ${line}`);
      continue;
    }
    if (!isNotificationPayload(payload)) {
      result.invalid += 1;
      rejects.push(`reason=bad_shape ${line}`);
      continue;
    }
    const parsed = parseNotification(payload, extraPackages);
    if (!parsed) {
      // The common case: capture worked, the parser's amount/verb heuristics
      // didn't match this bank's wording. Keeping the raw line is what makes
      // that fixable instead of invisible.
      result.invalid += 1;
      rejects.push(`reason=unparsed ${line}`);
      continue;
    }

    const currentExpenses = useStore.getState().expenses;
    if (
      alreadyImported(currentExpenses, {
        date: parsed.date,
        time: parsed.time,
        amount: parsed.amount,
      })
    ) {
      result.skipped += 1;
      continue;
    }

    // Compose the full raw notification text as the note so the user has the
    // exact wording the parser saw. Useful when the heuristics miss a
    // merchant or misclassify income vs expense — they can fix the row
    // confidently because the source text is right there.
    const note = payload.title
      ? `${payload.title}\n${payload.body}`
      : payload.body;

    await addExpense({
      amount: parsed.amount,
      type: parsed.type,
      categoryId: 'uncategorized',
      merchant: parsed.merchant,
      paymentMethod: parsed.paymentMethod,
      note,
      tags: [],
      date: parsed.date,
      time: parsed.time,
      source: 'notification',
      status: 'pending',
      recurringId: null,
    });
    result.inserted += 1;
  }

  await writeRejects(rejects);

  return result;
}
