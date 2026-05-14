/**
 * Domain types for Nook. The local DB schema, repositories, store, and screens
 * all consume these. Adding a field here is the first step of any data change.
 */

export type Source = 'manual' | 'sms' | 'recurring' | 'notification';

/**
 * Lifecycle status for an expense row.
 *
 *   - `confirmed`: visible everywhere; counts toward aggregates.
 *   - `pending`:   detected from a notification, awaiting user review.
 *                  Surfaces in the dashboard's pending tray only; excluded
 *                  from totals/charts until confirmed.
 *   - `rejected`:  user dismissed the detection; soft-deleted. Hidden by
 *                  default but recoverable from the search screen.
 */
export type ExpenseStatus = 'confirmed' | 'pending' | 'rejected';

export type Period = 'day' | 'week' | 'month' | 'year' | 'custom';

export type PaymentMethod = 'cash' | 'card' | 'upi' | 'bank';

export type TxnType = 'expense' | 'income';

export type ChartKind = 'bar' | 'donut' | 'line' | 'budget';

export type Density = 'compact' | 'dense';

export type Frequency = 'daily' | 'weekly' | 'monthly';

export type ThemeScheme = 'light' | 'dark' | 'system';

export interface Expense {
  id: string;
  amount: number;
  type: TxnType;
  categoryId: string;
  merchant: string | null;
  paymentMethod: PaymentMethod;
  note: string | null;
  tags: string[];
  /** ISO date — `YYYY-MM-DD` */
  date: string;
  /** Local time — `HH:MM` */
  time: string;
  source: Source;
  status: ExpenseStatus;
  recurringId: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface Category {
  id: string;
  name: string;
  /** PIcon name */
  icon: string;
  /** Hex color */
  color: string;
  /** True for user-created categories; false for seeded defaults */
  custom: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Budget {
  id: string;
  type: 'overall' | 'category';
  categoryId: string | null;
  amount: number;
  periodType: 'monthly';
  /** 0..1 — surface warning when usage crosses this fraction */
  warnThreshold: number;
  createdAt: string;
  updatedAt: string;
}

export interface RecurringExpense {
  id: string;
  amount: number;
  type: TxnType;
  categoryId: string;
  merchant: string;
  paymentMethod: PaymentMethod;
  note: string | null;
  frequency: Frequency;
  /** ISO date — `YYYY-MM-DD` */
  startDate: string;
  /** ISO date — `YYYY-MM-DD` */
  nextOccurrence: string;
  /** ISO date of the most recently materialized occurrence, or null */
  lastGenerated: string | null;
  active: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Settings {
  currency: string;
  /** Date format token, e.g. `'DD MMM YYYY'` */
  dateFormat: string;
  themeScheme: ThemeScheme;
  /** AccentKey from constants/theme.ts ACCENTS */
  accent: string;
  density: Density;
  defaultChart: ChartKind;
  onboarded: boolean;
  /** ISO timestamp when default categories were seeded, or null */
  seededAt: string | null;
}

export interface Filters {
  period: Period;
  /** Only meaningful when period === 'custom' */
  startDate?: string;
  endDate?: string;
  categoryIds: string[];
  paymentMethods: PaymentMethod[];
  minAmount?: number;
  maxAmount?: number;
  tags: string[];
}
