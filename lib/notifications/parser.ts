import type { PaymentMethod, TxnType } from '@/lib/types';

import { isAllowedPackage } from './allowlist.ts';
import { paymentMethodForPackage } from './paymentMap.ts';

export type NotificationPayload = {
  packageName: string;
  title: string;
  body: string;
  /** Epoch ms from Android's StatusBarNotification.postTime */
  postTime: number;
};

export type ParsedTransaction = {
  amount: number;
  type: TxnType;
  merchant: string | null;
  paymentMethod: PaymentMethod;
  /** ISO date — YYYY-MM-DD, derived from postTime in the device's local zone */
  date: string;
  /** HH:MM */
  time: string;
  /**
   * `high`   — amount + verb + merchant all matched.
   * `medium` — amount + verb matched but no merchant attribution was found.
   * Low/none confidence rows are rejected (parser returns null).
   */
  confidence: 'high' | 'medium';
  source: 'notification';
  /** Raw originating package, kept for dedupe + debugging. */
  rawPackage: string;
};

// Amount: matches ₹450, Rs.450, Rs 450, INR 450, INR 450.00, Rs 1,250.50
const AMOUNT_RE = /(?:Rs\.?|INR|₹)\s?([\d,]+(?:\.\d{1,2})?)/i;

// Verb buckets. Ordering matters: more specific verbs (purchase) come before
// short generic ones (paid) since the regex matches the first alternative.
const EXPENSE_VERB_RE =
  /\b(debited|deducted|spent|paid|sent|purchase(?:d)?|withdrawn|transferred)\b/i;
const INCOME_VERB_RE =
  /\b(credited|received|deposit(?:ed)?|refund(?:ed)?|salary|earned)\b/i;

// Merchant attribution. We deliberately keep this strict: a capitalized noun
// phrase (2–40 chars) following "at" / "to" / "from". Trailing punctuation,
// dates, and reference numbers are trimmed by the post-match cleanup.
const MERCHANT_RE =
  /(?:\bat\s+|\bto\s+|\bfrom\s+)([A-Z][A-Za-z0-9 &.'\-]{2,40})/;

// Phrases we strip from a merchant capture before returning it. Some banks
// pack reference numbers or dates into the same line as the merchant.
const MERCHANT_TRAILER_RE =
  /\s+(?:on|via|ref|txn|info|by|using|\d{2}-?[a-z]{3}-?\d{2,4}).*$/i;

function parseAmount(text: string): number | null {
  const m = AMOUNT_RE.exec(text);
  if (!m) return null;
  const cleaned = m[1].replace(/,/g, '');
  const n = parseFloat(cleaned);
  return Number.isFinite(n) && n > 0 ? n : null;
}

function classifyType(text: string): TxnType | null {
  if (EXPENSE_VERB_RE.test(text)) return 'expense';
  if (INCOME_VERB_RE.test(text)) return 'income';
  return null;
}

function extractMerchant(text: string): string | null {
  const m = MERCHANT_RE.exec(text);
  if (!m) return null;
  const raw = m[1].trim();
  const trimmed = raw.replace(MERCHANT_TRAILER_RE, '').trim();
  // Strip trailing punctuation that the trailer regex doesn't catch
  // (e.g. "AMAZON.IN." → "AMAZON.IN").
  const cleaned = trimmed.replace(/[.,;:]+$/, '').trim();
  // Bail on obvious false positives (single short noise tokens)
  if (cleaned.length < 3) return null;
  return cleaned;
}

function formatLocalDate(d: Date): string {
  const yyyy = d.getFullYear();
  const mm = String(d.getMonth() + 1).padStart(2, '0');
  const dd = String(d.getDate()).padStart(2, '0');
  return `${yyyy}-${mm}-${dd}`;
}

function formatLocalTime(d: Date): string {
  return `${String(d.getHours()).padStart(2, '0')}:${String(
    d.getMinutes(),
  ).padStart(2, '0')}`;
}

/**
 * Parse a single notification payload into a transaction draft. Returns null
 * if the package is not allowlisted, or if the body lacks both a recognizable
 * amount and a debit/credit verb.
 *
 * This is the single chokepoint for converting raw notification text into
 * structured data — anywhere else in the codebase that wants to turn
 * notification text into a row goes through here.
 *
 * `extraPackages` is the user's own allowlist additions
 * (`Settings.notificationPackages`), passed in by the caller so this module
 * stays pure and node-runnable. Note the native service applies its own copy of
 * the allowlist independently; both gates must agree or a notification is
 * accepted natively and then dropped here without a trace.
 */
export function parseNotification(
  raw: NotificationPayload,
  extraPackages: readonly string[] = [],
): ParsedTransaction | null {
  if (!isAllowedPackage(raw.packageName, extraPackages)) return null;

  // Search the combined title+body so multi-line bank notifications where
  // the amount lives in the title and the verb in the body still parse.
  const haystack = `${raw.title}\n${raw.body}`;

  const amount = parseAmount(haystack);
  if (amount === null) return null;

  const type = classifyType(haystack);
  if (type === null) return null;

  const merchant = extractMerchant(haystack);
  const confidence: 'high' | 'medium' = merchant ? 'high' : 'medium';

  const when = new Date(raw.postTime);

  return {
    amount,
    type,
    merchant,
    paymentMethod: paymentMethodForPackage(raw.packageName, raw.body),
    date: formatLocalDate(when),
    time: formatLocalTime(when),
    confidence,
    source: 'notification',
    rawPackage: raw.packageName,
  };
}
