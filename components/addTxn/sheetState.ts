import {
  type DraftErrors,
  type TransactionDraft,
  emptyDraft,
  fromExpense,
} from '@/lib/domain/transactionDraft';
import type { Expense } from '@/lib/types';

/**
 * Sheet modes:
 *   - `create`: fresh draft, manual entry from the FAB.
 *   - `edit`:   editing an existing confirmed expense.
 *   - `review`: confirming/editing a `status: 'pending'` row that was
 *               auto-detected from a notification. Save flips status to
 *               'confirmed'; the reject button replaces delete.
 */
export type SheetMode = 'create' | 'edit' | 'review';
export type SheetStep = 0 | 1 | 2;

export type SheetState = {
  mode: SheetMode;
  /** Set in edit/review mode so we know which row to update on save */
  initial: Expense | null;
  draft: TransactionDraft;
  step: SheetStep;
  errors: DraftErrors;
};

export type SheetAction =
  | { type: 'open-create' }
  | { type: 'open-edit'; expense: Expense }
  | { type: 'open-review'; expense: Expense }
  | { type: 'next' }
  | { type: 'prev' }
  | { type: 'go-to'; step: SheetStep }
  | { type: 'patch'; patch: Partial<TransactionDraft> }
  | { type: 'set-errors'; errors: DraftErrors }
  | { type: 'reset' };

export const initialSheetState: SheetState = {
  mode: 'create',
  initial: null,
  draft: emptyDraft(),
  step: 0,
  errors: {},
};

export function sheetReducer(
  state: SheetState,
  action: SheetAction,
): SheetState {
  switch (action.type) {
    case 'open-create':
      return {
        mode: 'create',
        initial: null,
        draft: emptyDraft(),
        step: 0,
        errors: {},
      };
    case 'open-edit':
      return {
        mode: 'edit',
        initial: action.expense,
        draft: fromExpense(action.expense),
        step: 0,
        errors: {},
      };
    case 'open-review':
      return {
        mode: 'review',
        initial: action.expense,
        draft: fromExpense(action.expense),
        // Land on Category step for parsed rows so the user has to confirm
        // an uncategorized detection before they can hit Confirm.
        step: action.expense.categoryId === 'uncategorized' ? 1 : 2,
        errors: {},
      };
    case 'next':
      return state.step < 2
        ? { ...state, step: (state.step + 1) as SheetStep, errors: {} }
        : state;
    case 'prev':
      return state.step > 0
        ? { ...state, step: (state.step - 1) as SheetStep, errors: {} }
        : state;
    case 'go-to':
      return { ...state, step: action.step, errors: {} };
    case 'patch':
      return { ...state, draft: { ...state.draft, ...action.patch } };
    case 'set-errors':
      return { ...state, errors: action.errors };
    case 'reset':
      return initialSheetState;
  }
}
