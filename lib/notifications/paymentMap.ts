import type { PaymentMethod } from '@/lib/types';

/**
 * Maps a notifying app's package name to a best-guess PaymentMethod for the
 * parsed transaction. Wrong guesses are fine — the user fixes them at review
 * time. The aim is to default to the most likely value so high-confidence
 * one-tap confirmations land in the right bucket.
 *
 *   - UPI apps   → 'upi'
 *   - Card apps  → 'card'
 *   - Bank apps  → 'bank' (card may be more accurate when body mentions
 *                  "card debited", but we'd rather under-claim and let the
 *                  user upgrade than mislabel)
 */
const PAYMENT_BY_PACKAGE: Record<string, PaymentMethod> = {
  // UPI / wallets
  'com.phonepe.app': 'upi',
  'com.google.android.apps.nbu.paisa.user': 'upi',
  'net.one97.paytm': 'upi',
  'in.org.npci.upiapp': 'upi',
  'com.cred.app': 'upi',
  'com.amazon.mShop.android.shopping': 'upi',

  // Card issuers
  'com.americanexpress.android.acctsvcs.in': 'card',
  'com.sbicard.epay': 'card',

  // Retail banks (default 'bank'; refine via body if needed)
  'com.csam.icici.bank.imobile': 'bank',
  'com.snapwork.hdfc': 'bank',
  'com.sbi.SBIFreedomPlus': 'bank',
  'com.axis.mobile': 'bank',
  'com.kotak.bank.android': 'bank',
  'com.idfcfirstbank.optimus': 'bank',
};

export function paymentMethodForPackage(
  packageName: string,
  body: string,
): PaymentMethod {
  // If a bank app explicitly mentions "card", upgrade the guess. Bank push
  // notifications often distinguish "card debited" from "a/c debited".
  const guess = PAYMENT_BY_PACKAGE[packageName] ?? 'bank';
  if (guess === 'bank' && /\bcard\b/i.test(body)) return 'card';
  return guess;
}
