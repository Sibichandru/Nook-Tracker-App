/**
 * Notification source allowlist.
 *
 * Only notifications from these app packages are considered for parsing.
 * Everything else (promotional, system, spam) is dropped at the gate so the
 * parser never even sees it.
 *
 * This JS list is authoritative. `syncAllowlist` writes it (unioned with the
 * user's own additions from Settings) to `allowlist.json`, and the native
 * service re-reads that file with mtime invalidation — so **adding an app here
 * takes effect without a native rebuild**. The hardcoded set in
 * `NookNotificationListenerService.kt` is only a first-launch fallback for when
 * that file doesn't exist yet; it does not need to be kept in sync.
 *
 * Coverage focus: Indian UPI apps, the major retail banks, a few card issuers,
 * and SMS — most Indian bank transaction alerts arrive as text messages rather
 * than as banking-app notifications.
 *
 * Adding a new app:
 *   1. Easiest: trigger a notification from it, then use the tap-to-add list on
 *      the notification diagnostics screen. No code change at all.
 *   2. To make it a built-in: add the exact package here (`adb shell pm list
 *      packages | grep <hint>`), and add fixtures to parserSmoke.ts for its
 *      typical wording. A paymentMap entry is optional — unknown packages fall
 *      back to 'bank', upgraded to 'card' when the body mentions a card.
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
  'com.naviapp', // Navi

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

  // SMS. Bank alerts in India are predominantly text messages, and the
  // notification for them is posted by the messaging app rather than the bank.
  // The parser still requires an amount and a debit/credit verb, so ordinary
  // texts are rejected — but note every SMS notification does transit the local
  // queue file on its way to that check.
  'com.google.android.apps.messaging',
]);

/**
 * Whether a package is captured. `extra` carries the user's own additions
 * (`Settings.notificationPackages`) and is passed in by the caller rather than
 * cached in module state — this file is imported by the node smoke runner and
 * must stay free of store/React/expo imports, and reading the list at the point
 * of use makes it impossible for it to go stale.
 */
export function isAllowedPackage(
  packageName: string,
  extra: readonly string[] = [],
): boolean {
  return ALLOWED_PACKAGES.has(packageName) || extra.includes(packageName);
}

/**
 * Normalizes and validates a user-supplied package name before it reaches
 * settings or `allowlist.json`. Returns null when unusable.
 *
 * Bad data here is not cosmetic: a malformed entry can make the JSON the native
 * service parses unusable, which silently drops it back to its built-in
 * fallback list.
 */
export function normalizePackageName(raw: string): string | null {
  const trimmed = raw.trim();
  if (!trimmed) return null;
  if (!/^[a-zA-Z0-9._]+$/.test(trimmed)) return null;
  return trimmed;
}
