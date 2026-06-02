/**
 * Pick a CSV file via the system document picker, read it, parse it through
 * {@link expensesFromCSV}, and hand the result back to the caller for
 * preview/confirmation before insertion.
 *
 * Separated from the actual DB insert step so the Settings screen can show
 * the user a row count + invalid-line summary before they commit. The caller
 * loops the returned `valid` array through the store's `addExpense` action.
 */

import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system/legacy';

import { expensesFromCSV, type ImportResult } from './domain/csv';
import type { Category } from './types';

export type CsvPickResult =
  | { kind: 'cancelled' }
  | {
      kind: 'parsed';
      filename: string;
      result: ImportResult;
    };

export async function pickAndParseCSV(
  categories: Category[],
): Promise<CsvPickResult> {
  const picked = await DocumentPicker.getDocumentAsync({
    // Some Android file managers expose CSVs as text/comma-separated-values
    // or text/plain. Accept the wildcard family so we don't lock users out.
    type: ['text/csv', 'text/comma-separated-values', 'text/plain', '*/*'],
    multiple: false,
    copyToCacheDirectory: true,
  });

  if (picked.canceled) return { kind: 'cancelled' };

  const file = picked.assets[0];
  if (!file) return { kind: 'cancelled' };

  const csv = await FileSystem.readAsStringAsync(file.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  const result = expensesFromCSV(csv, categories);
  return { kind: 'parsed', filename: file.name ?? 'import.csv', result };
}
