/**
 * Pure CSV serializer for expenses. Handles RFC 4180-ish quoting: fields
 * containing commas, double-quotes, or newlines are wrapped in quotes, and
 * embedded quotes are doubled. The expense `id`, `date`, `time`, etc. are
 * already safe primitives — only merchant/note/tags need escaping.
 */

import type { Category, Expense } from '@/lib/types';

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
    ].join(',');
  });
  return [headerLine, ...lines].join('\n');
}
