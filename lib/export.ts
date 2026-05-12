// expo-file-system v19 (SDK 54) renamed the top-level API. The legacy entry
// point exposes the familiar documentDirectory / writeAsStringAsync /
// EncodingType surface used here.
import * as FileSystem from 'expo-file-system/legacy';
import * as Sharing from 'expo-sharing';

import { expensesToCSV } from './domain/csv';
import type { Category, Expense } from './types';

export type ExportResult = {
  uri: string;
  filename: string;
};

/**
 * Serializes `expenses` to a CSV and writes it to the app's document directory.
 * Returns the file URI + suggested filename for sharing.
 */
export async function writeExpensesCSV(
  expenses: Expense[],
  categoriesById: Map<string, Category>,
): Promise<ExportResult> {
  const csv = expensesToCSV(expenses, categoriesById);
  const date = new Date().toISOString().slice(0, 10);
  const filename = `nook-export-${date}.csv`;
  const dir = FileSystem.documentDirectory;
  if (!dir) {
    throw new Error('No document directory available on this platform.');
  }
  const uri = dir + filename;
  await FileSystem.writeAsStringAsync(uri, csv, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { uri, filename };
}

/**
 * Opens the system share sheet for a previously-written file.
 * No-op (throws) on platforms without sharing support (e.g. web).
 */
export async function shareFile(uri: string, filename: string): Promise<void> {
  const isAvailable = await Sharing.isAvailableAsync();
  if (!isAvailable) {
    throw new Error('Sharing is not available on this device.');
  }
  await Sharing.shareAsync(uri, {
    mimeType: 'text/csv',
    dialogTitle: 'Export Nook expenses',
    UTI: 'public.comma-separated-values-text',
  });
}

/**
 * Convenience wrapper for the Settings screen: write + share in one call.
 */
export async function exportAndShareExpenses(
  expenses: Expense[],
  categoriesById: Map<string, Category>,
): Promise<ExportResult> {
  const result = await writeExpensesCSV(expenses, categoriesById);
  await shareFile(result.uri, result.filename);
  return result;
}
