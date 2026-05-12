import { randomUUID } from 'expo-crypto';
import type { SQLiteDatabase } from 'expo-sqlite';

import { DEFAULT_CATEGORIES } from '@/lib/domain/categories';
import type { Settings } from '@/lib/types';

/**
 * Idempotent default-category seed.
 *
 * The v1 migration inserts a Settings row with `seededAt: null`. We use that
 * flag (not "categories table empty") to decide whether to seed — that way, a
 * user who deletes every default category doesn't get them re-created on next
 * launch.
 *
 * Safe to call on every app start.
 */
export async function seedIfNeeded(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ value: string }>(
    "SELECT value FROM settings WHERE key = 'app'",
  );
  if (!row) return; // v1 migration didn't run — nothing we can do here

  let settings: Settings;
  try {
    settings = JSON.parse(row.value) as Settings;
  } catch {
    return; // corrupt settings; SettingsRepo will repair on next read
  }

  if (settings.seededAt) return;

  await db.withTransactionAsync(async () => {
    const now = new Date().toISOString();
    for (const cat of DEFAULT_CATEGORIES) {
      await db.runAsync(
        `INSERT INTO categories
           (id, name, icon, color, custom, created_at, updated_at)
         VALUES (?, ?, ?, ?, ?, ?, ?)`,
        [randomUUID(), cat.name, cat.icon, cat.color, cat.custom ? 1 : 0, now, now],
      );
    }
    const updated: Settings = { ...settings, seededAt: now };
    await db.runAsync(
      "UPDATE settings SET value = ? WHERE key = 'app'",
      [JSON.stringify(updated)],
    );
  });
}
