/**
 * Date-range helpers for the dashboard's period selector. Each helper returns
 * ISO-date (`YYYY-MM-DD`) strings ready to feed to the expense filter.
 *
 * Direct date-fns imports are used (rather than `from 'date-fns'`) so the
 * bundle only ships the functions we actually use.
 */

import { endOfDay } from 'date-fns/endOfDay';
import { endOfMonth } from 'date-fns/endOfMonth';
import { endOfWeek } from 'date-fns/endOfWeek';
import { endOfYear } from 'date-fns/endOfYear';
import { format } from 'date-fns/format';
import { startOfDay } from 'date-fns/startOfDay';
import { startOfMonth } from 'date-fns/startOfMonth';
import { startOfWeek } from 'date-fns/startOfWeek';
import { startOfYear } from 'date-fns/startOfYear';
import { subDays } from 'date-fns/subDays';
import { subMonths } from 'date-fns/subMonths';
import { subWeeks } from 'date-fns/subWeeks';
import { subYears } from 'date-fns/subYears';

import type { Period } from '@/lib/types';

export type DateRange = { start: string; end: string };

const isoDate = (d: Date): string => d.toISOString().slice(0, 10);

export function rangeFor(period: Period, ref: Date = new Date()): DateRange {
  switch (period) {
    case 'day':
      return { start: isoDate(startOfDay(ref)), end: isoDate(endOfDay(ref)) };
    case 'week':
      return {
        start: isoDate(startOfWeek(ref, { weekStartsOn: 1 })),
        end: isoDate(endOfWeek(ref, { weekStartsOn: 1 })),
      };
    case 'month':
      return {
        start: isoDate(startOfMonth(ref)),
        end: isoDate(endOfMonth(ref)),
      };
    case 'year':
      return {
        start: isoDate(startOfYear(ref)),
        end: isoDate(endOfYear(ref)),
      };
    case 'custom':
      // No custom range bound to a single date — caller must provide explicit
      // start/end via Filters. Fall back to current month for a sensible default.
      return {
        start: isoDate(startOfMonth(ref)),
        end: isoDate(endOfMonth(ref)),
      };
  }
}

export function previousRange(
  period: Period,
  ref: Date = new Date(),
): DateRange {
  switch (period) {
    case 'day':
      return rangeFor('day', subDays(ref, 1));
    case 'week':
      return rangeFor('week', subWeeks(ref, 1));
    case 'month':
      return rangeFor('month', subMonths(ref, 1));
    case 'year':
      return rangeFor('year', subYears(ref, 1));
    case 'custom':
      return rangeFor('month', subMonths(ref, 1));
  }
}

export function currentPeriodLabel(
  period: Period,
  ref: Date = new Date(),
): string {
  switch (period) {
    case 'day':
      return `Spent on ${format(ref, 'd MMM')}`;
    case 'week':
      return 'Spent this week';
    case 'month':
      return `Spent in ${format(ref, 'MMMM')}`;
    case 'year':
      return `Spent in ${format(ref, 'yyyy')}`;
    case 'custom':
      return 'Spent';
  }
}
