/**
 * Smoke check for database open + migration runner.
 *
 * Not a test framework test — called from a future `_dev` route to verify the
 * DB layer works end-to-end on a real device. Returns the rows currently in
 * `schema_version` so a dev screen can render them.
 */

import { getDatabase } from '../database';

export type SmokeResult = {
  ok: boolean;
  rows: { version: number; applied_at: string }[];
  error?: string;
};

export async function smokeOpenDatabase(): Promise<SmokeResult> {
  try {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ version: number; applied_at: string }>(
      'SELECT version, applied_at FROM schema_version ORDER BY version',
    );
    return { ok: true, rows };
  } catch (e) {
    return {
      ok: false,
      rows: [],
      error: e instanceof Error ? e.message : String(e),
    };
  }
}
