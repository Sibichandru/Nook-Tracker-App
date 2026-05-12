/**
 * SQLite connection + migration runner.
 *
 * `getDatabase()` is the single entry point used by every repository. On first
 * call it opens the database, ensures the `schema_version` table exists, and
 * applies any migrations whose version is greater than the current max.
 * Subsequent calls return the cached connection.
 *
 * The connection is cached because expo-sqlite supports concurrent reads on a
 * single open handle, and reopening on every query is needless overhead.
 */

import { openDatabaseAsync, type SQLiteDatabase } from 'expo-sqlite';

import { migrations } from './migrations';
import { seedIfNeeded } from './seed';

const DB_NAME = 'nook.db';

let dbInstance: SQLiteDatabase | null = null;
let initialized = false;
let openingPromise: Promise<SQLiteDatabase> | null = null;

export async function getDatabase(): Promise<SQLiteDatabase> {
  if (dbInstance && initialized) return dbInstance;
  // Coalesce concurrent first-time callers onto one open+migrate operation.
  if (!openingPromise) {
    openingPromise = (async () => {
      const db = await openDatabaseAsync(DB_NAME);
      await ensureSchemaVersionTable(db);
      await runMigrations(db);
      await seedIfNeeded(db);
      dbInstance = db;
      initialized = true;
      return db;
    })();
  }
  try {
    return await openingPromise;
  } finally {
    if (initialized) openingPromise = null;
  }
}

async function ensureSchemaVersionTable(db: SQLiteDatabase): Promise<void> {
  await db.execAsync(
    `CREATE TABLE IF NOT EXISTS schema_version (
       version INTEGER PRIMARY KEY,
       applied_at TEXT NOT NULL
     );`,
  );
}

async function runMigrations(db: SQLiteDatabase): Promise<void> {
  const row = await db.getFirstAsync<{ version: number | null }>(
    'SELECT MAX(version) AS version FROM schema_version',
  );
  const current = row?.version ?? 0;
  const pending = migrations
    .filter((m) => m.version > current)
    .sort((a, b) => a.version - b.version);

  for (const m of pending) {
    await db.withTransactionAsync(async () => {
      await m.up(db);
      await db.runAsync(
        'INSERT INTO schema_version (version, applied_at) VALUES (?, ?)',
        [m.version, new Date().toISOString()],
      );
    });
  }
}

/**
 * Reset the cached connection. Used by smoke tests and dev tooling that
 * exercise the open path. Not for production code paths.
 */
export function resetDatabaseSingleton(): void {
  dbInstance = null;
  initialized = false;
  openingPromise = null;
}
