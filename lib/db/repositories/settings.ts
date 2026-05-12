import { DEFAULT_SETTINGS } from '@/lib/domain/settings';
import type { Settings } from '@/lib/types';

import { getDatabase } from '../database';

const KEY = 'app';

/**
 * Settings is a single-row JSON store rather than a per-field schema. Avoids
 * migration churn when adding new settings; reads/writes the full Settings
 * object atomically.
 */
export const SettingsRepo = {
  async get(): Promise<Settings> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<{ value: string }>(
      'SELECT value FROM settings WHERE key = ?',
      [KEY],
    );
    if (!row) {
      // Defensive: should never happen (v1 migration inserts default).
      // Insert defaults and return them.
      await db.runAsync(
        'INSERT OR REPLACE INTO settings (key, value) VALUES (?, ?)',
        [KEY, JSON.stringify(DEFAULT_SETTINGS)],
      );
      return DEFAULT_SETTINGS;
    }
    try {
      return { ...DEFAULT_SETTINGS, ...(JSON.parse(row.value) as Settings) };
    } catch {
      // Corrupt JSON — overwrite with defaults
      await db.runAsync(
        'UPDATE settings SET value = ? WHERE key = ?',
        [JSON.stringify(DEFAULT_SETTINGS), KEY],
      );
      return DEFAULT_SETTINGS;
    }
  },

  async update(patch: Partial<Settings>): Promise<Settings> {
    const current = await SettingsRepo.get();
    const next: Settings = { ...current, ...patch };
    const db = await getDatabase();
    await db.runAsync(
      'UPDATE settings SET value = ? WHERE key = ?',
      [JSON.stringify(next), KEY],
    );
    return next;
  },
};
