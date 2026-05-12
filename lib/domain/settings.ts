import type { Settings } from '@/lib/types';

/**
 * Default Settings record inserted on first migration and used as the fallback
 * when reading settings. `seededAt: null` is the signal that the default
 * category seed hasn't run yet — see lib/db/seed.ts.
 */
export const DEFAULT_SETTINGS: Settings = {
  currency: 'INR',
  dateFormat: 'DD MMM YYYY',
  themeScheme: 'system',
  accent: 'teal',
  density: 'compact',
  defaultChart: 'bar',
  onboarded: false,
  seededAt: null,
};
