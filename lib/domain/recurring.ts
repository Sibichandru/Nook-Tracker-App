/**
 * Pure helpers for the recurring-expense engine.
 *
 * The engine itself (which inserts into SQLite) lives in `lib/store.ts` as the
 * `runRecurringEngine` action. This module is side-effect-free so it's easy
 * to test and reason about.
 */

import { addDays } from 'date-fns/addDays';
import { addMonths } from 'date-fns/addMonths';
import { addWeeks } from 'date-fns/addWeeks';

import type { Frequency, RecurringExpense } from '@/lib/types';

const toISODate = (d: Date): string => d.toISOString().slice(0, 10);

export function advance(date: Date, frequency: Frequency): Date {
  switch (frequency) {
    case 'daily':
      return addDays(date, 1);
    case 'weekly':
      return addWeeks(date, 1);
    case 'monthly':
      return addMonths(date, 1);
  }
}

/**
 * Returns the ISO dates between (lastGenerated || startDate) and asOf that the
 * rule should materialize. Each date is produced exactly once, regardless of
 * how many times this function is called — idempotency comes from the rule's
 * `lastGenerated` cursor being advanced by the caller after applying.
 *
 * Inactive rules produce no occurrences.
 */
export function computeOccurrences(
  rule: RecurringExpense,
  asOf: Date = new Date(),
): string[] {
  if (!rule.active) return [];

  const cursor = rule.lastGenerated
    ? advance(new Date(rule.lastGenerated), rule.frequency)
    : new Date(rule.startDate);

  const occurrences: string[] = [];
  let next = cursor;
  // Guardrail: stop after 366 iterations to avoid runaway loops if the data
  // is corrupt (e.g. a startDate 10 years in the past with frequency 'daily').
  let guard = 0;
  while (next <= asOf && guard < 366) {
    occurrences.push(toISODate(next));
    next = advance(next, rule.frequency);
    guard++;
  }
  return occurrences;
}
