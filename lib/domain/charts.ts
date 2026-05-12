/**
 * Chart-data prep helpers. Pure functions that turn a list of Expenses into
 * the shapes each chart needs. Living in `lib/domain/` so they're testable
 * without RN/SVG.
 */

import { format } from 'date-fns/format';
import { startOfMonth } from 'date-fns/startOfMonth';
import { subDays } from 'date-fns/subDays';
import { subMonths } from 'date-fns/subMonths';

import type { Category, Expense } from '@/lib/types';

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export type DailyTotal = { date: string; amount: number };

/**
 * Returns `days` daily expense totals ending on `ref` (default: today).
 * Days with no expenses come back as `{ date, amount: 0 }`.
 */
export function dailyTotals(
  expenses: Expense[],
  days: number = 24,
  ref: Date = new Date(),
): DailyTotal[] {
  const totals = new Map<string, number>();
  for (let i = 0; i < days; i++) {
    const d = subDays(ref, days - 1 - i);
    totals.set(isoDate(d), 0);
  }
  for (const e of expenses) {
    if (e.type !== 'expense') continue;
    const existing = totals.get(e.date);
    if (existing !== undefined) {
      totals.set(e.date, existing + e.amount);
    }
  }
  return Array.from(totals.entries()).map(([date, amount]) => ({
    date,
    amount,
  }));
}

export type CategoryBucket = {
  categoryId: string;
  amount: number;
  color: string;
  name: string;
};

/**
 * Sums expenses by category and returns the top `limit` buckets sorted by
 * amount descending. Income is excluded. Unknown categories fall back to a
 * neutral grey "Other".
 */
/**
 * Returns the last `months` months of expense totals as DailyTotal-shaped
 * records (with `date` = first of the month). Lets us reuse LineChart for the
 * Reports screen's month-over-month trend without a separate chart component.
 */
export function monthlyTotalsAsDaily(
  expenses: Expense[],
  months: number = 6,
  ref: Date = new Date(),
): DailyTotal[] {
  const buckets = new Map<string, number>();
  for (let i = 0; i < months; i++) {
    const monthStart = startOfMonth(subMonths(ref, months - 1 - i));
    buckets.set(format(monthStart, 'yyyy-MM-dd'), 0);
  }
  for (const e of expenses) {
    if (e.type !== 'expense') continue;
    const monthKey = format(startOfMonth(new Date(e.date)), 'yyyy-MM-dd');
    if (buckets.has(monthKey)) {
      buckets.set(monthKey, (buckets.get(monthKey) ?? 0) + e.amount);
    }
  }
  return Array.from(buckets.entries()).map(([date, amount]) => ({
    date,
    amount,
  }));
}

export function topCategoryBuckets(
  expenses: Expense[],
  categoriesById: Map<string, Category>,
  limit: number = 6,
): CategoryBucket[] {
  const totals = new Map<string, number>();
  for (const e of expenses) {
    if (e.type !== 'expense') continue;
    totals.set(e.categoryId, (totals.get(e.categoryId) ?? 0) + e.amount);
  }
  return Array.from(totals.entries())
    .sort((a, b) => b[1] - a[1])
    .slice(0, limit)
    .map(([id, amount]) => {
      const cat = categoriesById.get(id);
      return {
        categoryId: id,
        amount,
        color: cat?.color ?? '#8B8E94',
        name: cat?.name ?? 'Other',
      };
    });
}
