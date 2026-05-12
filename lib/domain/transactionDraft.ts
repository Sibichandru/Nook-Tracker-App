/**
 * Mutable transaction-in-progress state used by the AddTxn sheet. Mirrors the
 * Expense entity but with optional fields (the user fills them in across
 * three steps). Validators below run after each step to gate progression.
 */

import type { Expense, PaymentMethod, TxnType } from '@/lib/types';

export type TransactionDraft = {
  amount: number;
  type: TxnType;
  categoryId: string | null;
  merchant: string | null;
  paymentMethod: PaymentMethod;
  note: string | null;
  tags: string[];
  /** ISO date `YYYY-MM-DD` */
  date: string;
  /** Local time `HH:MM` */
  time: string;
};

export type DraftErrors = Partial<Record<keyof TransactionDraft, string>>;

export function emptyDraft(now: Date = new Date()): TransactionDraft {
  return {
    amount: 0,
    type: 'expense',
    categoryId: null,
    merchant: null,
    paymentMethod: 'upi',
    note: null,
    tags: [],
    date: now.toISOString().slice(0, 10),
    time: now.toTimeString().slice(0, 5),
  };
}

export function fromExpense(e: Expense): TransactionDraft {
  return {
    amount: e.amount,
    type: e.type,
    categoryId: e.categoryId,
    merchant: e.merchant,
    paymentMethod: e.paymentMethod,
    note: e.note,
    tags: e.tags,
    date: e.date,
    time: e.time,
  };
}

/**
 * Validates the fields owned by `step`. Returns an error map.
 * step 0 — amount must be > 0
 * step 1 — category must be picked
 * step 2 — no required fields beyond what earlier steps captured
 */
export function validateStep(
  draft: TransactionDraft,
  step: number,
): DraftErrors {
  const errors: DraftErrors = {};
  if (step === 0) {
    if (draft.amount <= 0) errors.amount = 'Enter an amount';
  } else if (step === 1) {
    if (!draft.categoryId) errors.categoryId = 'Pick a category';
  }
  return errors;
}

/**
 * Edit-mode is more lenient — step nav doesn't gate. But save still
 * requires a positive amount and a category.
 */
export function validateForSave(draft: TransactionDraft): DraftErrors {
  return {
    ...validateStep(draft, 0),
    ...validateStep(draft, 1),
  };
}
