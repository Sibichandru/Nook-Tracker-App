/**
 * Pure CSV serializer + parser for expenses. Handles RFC 4180-ish quoting:
 * fields containing commas, double-quotes, or newlines are wrapped in quotes,
 * and embedded quotes are doubled. The expense `id`, `date`, `time`, etc. are
 * already safe primitives — only merchant/note/tags need escaping.
 */

import type {
  Category,
  Expense,
  ExpenseStatus,
  PaymentMethod,
  Source,
  TxnType,
} from '@/lib/types';

const HEADER = [
  'id',
  'date',
  'time',
  'type',
  'amount',
  'category',
  'merchant',
  'payment_method',
  'note',
  'tags',
  'source',
  'status',
];

function csvEscape(value: string | null): string {
  if (value === null || value === undefined) return '';
  if (/["\n,]/.test(value)) {
    return `"${value.replace(/"/g, '""')}"`;
  }
  return value;
}

export function expensesToCSV(
  expenses: Expense[],
  categoriesById: Map<string, Category>,
): string {
  const headerLine = HEADER.join(',');
  const lines = expenses.map((e) => {
    const cat = categoriesById.get(e.categoryId);
    return [
      e.id,
      e.date,
      e.time,
      e.type,
      e.amount.toString(),
      csvEscape(cat?.name ?? ''),
      csvEscape(e.merchant),
      e.paymentMethod,
      csvEscape(e.note),
      csvEscape(e.tags.join('|')),
      e.source,
      e.status,
    ].join(',');
  });
  return [headerLine, ...lines].join('\n');
}

// ───────────────────────────────────────────────────────────────────────────
// Import
// ───────────────────────────────────────────────────────────────────────────

/** Expense-like object ready to insert; `id`/`createdAt`/`updatedAt` are
 * assigned by the repo. Category is resolved to an id (or `'uncategorized'`
 * if the source name didn't match a known category). */
export type ImportedExpense = Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>;

export type ImportRowError = {
  /** 1-based row number in the source file (header is row 1). */
  row: number;
  reason: string;
};

export type ImportResult = {
  valid: ImportedExpense[];
  invalid: ImportRowError[];
};

const VALID_TYPES: ReadonlySet<TxnType> = new Set(['expense', 'income']);
const VALID_METHODS: ReadonlySet<PaymentMethod> = new Set([
  'cash',
  'card',
  'upi',
  'bank',
]);
const VALID_SOURCES: ReadonlySet<Source> = new Set([
  'manual',
  'sms',
  'recurring',
  'notification',
]);
const VALID_STATUSES: ReadonlySet<ExpenseStatus> = new Set([
  'confirmed',
  'pending',
  'rejected',
]);

const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
const TIME_RE = /^\d{2}:\d{2}$/;

/**
 * Parse a single CSV line into an array of fields, honoring quoted strings
 * with doubled-quote escapes. Returns null on malformed input (e.g.
 * unterminated quote).
 */
function parseCSVLine(line: string): string[] | null {
  const fields: string[] = [];
  let buf = '';
  let i = 0;
  let inQuotes = false;
  while (i < line.length) {
    const ch = line[i];
    if (inQuotes) {
      if (ch === '"') {
        if (line[i + 1] === '"') {
          buf += '"';
          i += 2;
          continue;
        }
        inQuotes = false;
        i += 1;
        continue;
      }
      buf += ch;
      i += 1;
      continue;
    }
    if (ch === '"') {
      inQuotes = true;
      i += 1;
      continue;
    }
    if (ch === ',') {
      fields.push(buf);
      buf = '';
      i += 1;
      continue;
    }
    buf += ch;
    i += 1;
  }
  if (inQuotes) return null;
  fields.push(buf);
  return fields;
}

/**
 * Split a CSV blob into logical lines, respecting newlines inside quoted
 * fields. Handles both LF and CRLF.
 */
function splitCSVLines(csv: string): string[] {
  const lines: string[] = [];
  let buf = '';
  let inQuotes = false;
  for (let i = 0; i < csv.length; i += 1) {
    const ch = csv[i];
    if (ch === '"') {
      // toggle (a doubled "" inside quotes also lands here twice, which
      // correctly flips back-and-forth and leaves us still "in quotes")
      inQuotes = !inQuotes;
      buf += ch;
      continue;
    }
    if (!inQuotes && (ch === '\n' || ch === '\r')) {
      if (ch === '\r' && csv[i + 1] === '\n') i += 1;
      if (buf.length > 0) lines.push(buf);
      buf = '';
      continue;
    }
    buf += ch;
  }
  if (buf.length > 0) lines.push(buf);
  return lines;
}

/**
 * Parses a CSV blob produced by {@link expensesToCSV} (or by any tool that
 * follows the same column layout) into a set of insert-ready drafts. Unknown
 * categories fall back to `'uncategorized'`; bad rows go in `invalid` with a
 * reason so the UI can show the user what was dropped.
 */
export function expensesFromCSV(
  csv: string,
  categories: Category[],
): ImportResult {
  const result: ImportResult = { valid: [], invalid: [] };
  const lines = splitCSVLines(csv);
  if (lines.length === 0) return result;

  const header = parseCSVLine(lines[0]);
  if (!header) {
    result.invalid.push({ row: 1, reason: 'Malformed header line' });
    return result;
  }
  const colIndex: Record<string, number> = {};
  header.forEach((name, i) => {
    colIndex[name.trim().toLowerCase()] = i;
  });

  // We only need date and amount to construct a usable row. Everything else
  // has a sensible fallback. If those two columns are missing, refuse.
  if (colIndex.date === undefined || colIndex.amount === undefined) {
    result.invalid.push({
      row: 1,
      reason: 'Missing required column: date or amount',
    });
    return result;
  }

  const catByName = new Map<string, Category>();
  categories.forEach((c) => catByName.set(c.name.trim().toLowerCase(), c));

  for (let li = 1; li < lines.length; li += 1) {
    const rowNum = li + 1;
    const fields = parseCSVLine(lines[li]);
    if (!fields) {
      result.invalid.push({ row: rowNum, reason: 'Malformed CSV (unterminated quote?)' });
      continue;
    }
    const get = (col: string): string => {
      const idx = colIndex[col];
      if (idx === undefined || idx >= fields.length) return '';
      return fields[idx].trim();
    };

    const rawAmount = get('amount');
    const amount = parseFloat(rawAmount.replace(/,/g, ''));
    if (!Number.isFinite(amount) || amount <= 0) {
      result.invalid.push({ row: rowNum, reason: `Invalid amount "${rawAmount}"` });
      continue;
    }

    const date = get('date');
    if (!DATE_RE.test(date)) {
      result.invalid.push({ row: rowNum, reason: `Invalid date "${date}" (expected YYYY-MM-DD)` });
      continue;
    }

    const rawTime = get('time');
    const time = TIME_RE.test(rawTime) ? rawTime : '00:00';

    const rawType = get('type').toLowerCase();
    const type: TxnType = VALID_TYPES.has(rawType as TxnType)
      ? (rawType as TxnType)
      : 'expense';

    const rawMethod = get('payment_method').toLowerCase();
    const paymentMethod: PaymentMethod = VALID_METHODS.has(
      rawMethod as PaymentMethod,
    )
      ? (rawMethod as PaymentMethod)
      : 'cash';

    const categoryName = get('category');
    const matchedCategory = categoryName
      ? catByName.get(categoryName.toLowerCase())
      : undefined;
    const categoryId = matchedCategory ? matchedCategory.id : 'uncategorized';

    const merchant = get('merchant') || null;
    const note = get('note') || null;
    const tagsRaw = get('tags');
    const tags = tagsRaw
      ? tagsRaw
          .split('|')
          .map((t) => t.trim())
          .filter((t) => t.length > 0)
      : [];

    const rawSource = get('source').toLowerCase();
    const source: Source = VALID_SOURCES.has(rawSource as Source)
      ? (rawSource as Source)
      : 'manual';

    const rawStatus = get('status').toLowerCase();
    const status: ExpenseStatus = VALID_STATUSES.has(rawStatus as ExpenseStatus)
      ? (rawStatus as ExpenseStatus)
      : 'confirmed';

    result.valid.push({
      amount,
      type,
      categoryId,
      merchant,
      paymentMethod,
      note,
      tags,
      date,
      time,
      source,
      status,
      recurringId: null,
    });
  }

  return result;
}
