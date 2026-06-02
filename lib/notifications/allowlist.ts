/**
 * Notification source allowlist.
 *
 * Only notifications from these app packages are considered for parsing.
 * Everything else (promotional, system, spam) is dropped at the gate so the
 * parser never even sees it. The same list is hardcoded in Kotlin on the
 * native side (iter 33) — keep these two in sync; the JS list is the
 * authoritative reference.
 *
 * Coverage focus: Indian UPI apps + the major retail banks + a few card
 * issuers. Package names verified against Play Store as of 2026-05.
 *
 * Adding a new app:
 *   1. Get the exact package via `adb shell pm list packages | grep <hint>`
 *   2. Add here AND in `NookNotificationListenerService.kt` (iter 33)
 *   3. Add a paymentMap entry below in paymentMap.ts
 *   4. Add fixtures to parserSmoke.ts for the new app's typical notifications
 */

export const ALLOWED_PACKAGES: ReadonlySet<string> = new Set([
  // UPI / wallets
  'com.phonepe.app',
  'com.google.android.apps.nbu.paisa.user', // Google Pay India
  'net.one97.paytm',
  'in.org.npci.upiapp', // BHIM
  'com.dreamplug.androidapp', // CRED (current package on Play Store)
  'com.cred.app', // CRED (legacy package; kept for safety)
  'com.amazon.mShop.android.shopping', // Amazon Pay notifications

  // Retail banks
  'com.csam.icici.bank.imobile',
  'com.snapwork.hdfc',
  'com.sbi.SBIFreedomPlus',
  'com.axis.mobile',
  'com.kotak.bank.android',
  'com.idfcfirstbank.optimus',

  // Card issuers
  'com.americanexpress.android.acctsvcs.in',
  'com.sbicard.epay',
]);

export function isAllowedPackage(packageName: string): boolean {
  return ALLOWED_PACKAGES.has(packageName);
}
