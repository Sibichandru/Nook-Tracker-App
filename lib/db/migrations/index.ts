import type { SQLiteDatabase } from 'expo-sqlite';

import { v1 } from './v1';
import { v2 } from './v2';

export type Migration = {
  version: number;
  up: (db: SQLiteDatabase) => Promise<void>;
};

/**
 * Ordered list of schema migrations. Each migration's `up` is run inside a
 * transaction by the migration runner. Versions must be strictly increasing.
 * Add new migrations to the end; never edit an applied migration — write a new
 * one instead.
 */
export const migrations: Migration[] = [v1, v2];
