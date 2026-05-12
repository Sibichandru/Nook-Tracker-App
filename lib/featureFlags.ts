/**
 * Centralized feature flags. Every gated feature in the app should check a
 * flag here rather than hardcoding `true`. Lets us flip behavior without
 * grepping through screens.
 *
 * Flags are typed-as-const so consumers see literal `true` / `false` rather
 * than `boolean`, which makes TypeScript narrow downstream code correctly.
 */

export const FLAGS = {
  enableSMS: false,
  enableDriveBackup: false,
  enableReports: true,
  enableSearch: true,
  enableBudgets: true,
  enableExport: true,
  enableRecurring: true,
  enableNotifications: false,
} as const;

export type FeatureFlag = keyof typeof FLAGS;
