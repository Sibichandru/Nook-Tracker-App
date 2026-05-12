import { DEFAULT_SETTINGS } from '@/lib/domain/settings';

import type { Migration } from './index';

/**
 * Schema v1: the entire local data layer for v1.0.
 *
 * Tables:
 *   - categories            (built-in + user-created)
 *   - expenses              (the main transaction table)
 *   - budgets               (overall + per-category, monthly)
 *   - recurring_expenses    (scheduled rules; the engine materializes Expenses from these)
 *   - settings              (single-row JSON store keyed by 'app')
 *
 * Notes:
 *   - `tags` is JSON-encoded into a TEXT column (no separate join table for v1).
 *   - `custom` and `active` are stored as INTEGER (0/1) because SQLite has no native bool.
 *   - Indexes target the two most common expense queries: by date (timeline)
 *     and by category (drill-down).
 *   - The default settings row is inserted here with `seededAt: null`; the
 *     post-migration seedIfNeeded step fills categories and flips seededAt.
 */
export const v1: Migration = {
  version: 1,
  up: async (db) => {
    await db.execAsync(`
      CREATE TABLE IF NOT EXISTS categories (
        id TEXT PRIMARY KEY,
        name TEXT NOT NULL,
        icon TEXT NOT NULL,
        color TEXT NOT NULL,
        custom INTEGER NOT NULL DEFAULT 0,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS expenses (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category_id TEXT NOT NULL,
        merchant TEXT,
        payment_method TEXT NOT NULL,
        note TEXT,
        tags TEXT NOT NULL DEFAULT '[]',
        date TEXT NOT NULL,
        time TEXT NOT NULL,
        source TEXT NOT NULL,
        recurring_id TEXT,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE INDEX IF NOT EXISTS idx_expenses_date ON expenses(date);
      CREATE INDEX IF NOT EXISTS idx_expenses_category ON expenses(category_id);

      CREATE TABLE IF NOT EXISTS budgets (
        id TEXT PRIMARY KEY,
        type TEXT NOT NULL,
        category_id TEXT,
        amount REAL NOT NULL,
        period_type TEXT NOT NULL DEFAULT 'monthly',
        warn_threshold REAL NOT NULL DEFAULT 0.8,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS recurring_expenses (
        id TEXT PRIMARY KEY,
        amount REAL NOT NULL,
        type TEXT NOT NULL,
        category_id TEXT NOT NULL,
        merchant TEXT NOT NULL,
        payment_method TEXT NOT NULL,
        note TEXT,
        frequency TEXT NOT NULL,
        start_date TEXT NOT NULL,
        next_occurrence TEXT NOT NULL,
        last_generated TEXT,
        active INTEGER NOT NULL DEFAULT 1,
        created_at TEXT NOT NULL,
        updated_at TEXT NOT NULL
      );

      CREATE TABLE IF NOT EXISTS settings (
        key TEXT PRIMARY KEY,
        value TEXT NOT NULL
      );
    `);

    await db.runAsync(
      "INSERT OR IGNORE INTO settings (key, value) VALUES ('app', ?)",
      [JSON.stringify(DEFAULT_SETTINGS)],
    );
  },
};
