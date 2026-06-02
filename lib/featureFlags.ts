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
  // CSV import depends on expo-document-picker (native module). The next
  // EAS build picks up the dep automatically, so this is on by default now.
  enableImport: true,
  enableRecurring: true,
  // Notification capture is now controlled by a per-user setting in the
  // Settings screen (`settings.notificationCaptureEnabled`). This static
  // flag is kept for any code path that needs a global kill-switch, but
  // day-to-day on/off is the user's call.
  enableNotifications: true,
  // `enableDevRoutes` gates the /dev/* sandbox routes used to visually verify
  // primitives and icons. Hard-off for v1.5 production rollout — the
  // sandboxes stay in the bundle but their Settings entrypoints are hidden.
  enableDevRoutes: false,
  // Synthetic pending-tray seeder. Off in v1.5 — real captures come from the
  // native listener; the sandbox isn't useful to ship.
  enableDevPending: false,
} as const;

export type FeatureFlag = keyof typeof FLAGS;
