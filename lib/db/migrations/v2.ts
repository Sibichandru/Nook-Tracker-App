import type { Migration } from './index';

/**
 * Schema v2: lifecycle status on expenses.
 *
 * Adds:
 *   - `expenses.status` (`'confirmed' | 'pending' | 'rejected'`) — needed for
 *     the notification auto-import flow, which lands rows as `'pending'` for
 *     user review before they count toward totals. Existing rows default to
 *     `'confirmed'` so v1.0 behavior is preserved.
 *   - `idx_expenses_status` — every aggregation now filters by status, so the
 *     index keeps period-level scans cheap.
 *   - `'uncategorized'` system category — parsed notification rows need a
 *     valid `category_id` (NOT NULL constraint), but we don't want to guess.
 *     The user picks a real category at review time. Marked `custom: 0` so
 *     the Category Manager won't let users delete it.
 */
export const v2: Migration = {
  version: 2,
  up: async (db) => {
    await db.execAsync(`
      ALTER TABLE expenses ADD COLUMN status TEXT NOT NULL DEFAULT 'confirmed';
      CREATE INDEX IF NOT EXISTS idx_expenses_status ON expenses(status);
    `);

    const now = new Date().toISOString();
    await db.runAsync(
      `INSERT OR IGNORE INTO categories
         (id, name, icon, color, custom, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      ['uncategorized', 'Uncategorized', 'wallet', '#9CA3AF', 0, now, now],
    );
  },
};
