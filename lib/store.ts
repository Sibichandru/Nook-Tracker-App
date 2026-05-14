/**
 * Nook's app-wide state store (Zustand).
 *
 * Architecture:
 *   - One flat store. No slices — kept intentionally simple.
 *   - Actions call repositories first, then update local state on success.
 *   - `hydrate()` runs once on app start (gated in app/_layout.tsx); after
 *     that, every read is from this store, every write goes here first.
 *   - UI state (active chart / period / category filter) lives alongside
 *     persisted state for ergonomic single-hook access. The persisted
 *     `settings.defaultChart` seeds `ui.activeChart` at hydration time.
 */

import { create } from 'zustand';

import {
  BudgetsRepo,
  CategoriesRepo,
  ExpensesRepo,
  RecurringRepo,
  SettingsRepo,
} from './db/repositories';
import { computeOccurrences } from './domain/recurring';
import { DEFAULT_SETTINGS } from './domain/settings';
import type {
  Budget,
  Category,
  ChartKind,
  Expense,
  Filters,
  Period,
  RecurringExpense,
  Settings,
} from './types';

type UIState = {
  activeChart: ChartKind;
  activePeriod: Period;
  activeCategoryFilter: string | null;
};

type StoreState = {
  hydrated: boolean;
  expenses: Expense[];
  categories: Category[];
  budgets: Budget[];
  recurring: RecurringExpense[];
  settings: Settings;
  filters: Filters;
  ui: UIState;
};

type StoreActions = {
  hydrate: () => Promise<void>;

  addExpense: (
    input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Expense>;
  updateExpense: (
    id: string,
    patch: Partial<Omit<Expense, 'id' | 'createdAt'>>,
  ) => Promise<void>;
  deleteExpense: (id: string) => Promise<void>;
  /**
   * Flip a pending detection to confirmed. Optional patch lets the review
   * sheet apply field edits in the same write (e.g. picking a real category
   * to replace 'uncategorized').
   */
  confirmExpense: (
    id: string,
    patch?: Partial<Omit<Expense, 'id' | 'createdAt'>>,
  ) => Promise<void>;
  /** Soft-delete a pending detection; recoverable via the search screen. */
  rejectExpense: (id: string) => Promise<void>;

  addCategory: (
    input: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Category>;
  updateCategory: (
    id: string,
    patch: Partial<Omit<Category, 'id' | 'createdAt'>>,
  ) => Promise<void>;
  deleteCategory: (id: string) => Promise<void>;

  addBudget: (
    input: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<Budget>;
  updateBudget: (
    id: string,
    patch: Partial<Omit<Budget, 'id' | 'createdAt'>>,
  ) => Promise<void>;
  deleteBudget: (id: string) => Promise<void>;

  addRecurring: (
    input: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>,
  ) => Promise<RecurringExpense>;
  updateRecurring: (
    id: string,
    patch: Partial<Omit<RecurringExpense, 'id' | 'createdAt'>>,
  ) => Promise<void>;
  deleteRecurring: (id: string) => Promise<void>;

  updateSettings: (patch: Partial<Settings>) => Promise<void>;

  setFilters: (patch: Partial<Filters>) => void;
  setActiveChart: (chart: ChartKind) => void;
  setActivePeriod: (period: Period) => void;
  setActiveCategoryFilter: (categoryId: string | null) => void;

  /**
   * Materializes any missed occurrences for active recurring rules.
   * Idempotent — safe to call multiple times in a session.
   */
  runRecurringEngine: () => Promise<void>;
};

const DEFAULT_FILTERS: Filters = {
  period: 'month',
  categoryIds: [],
  paymentMethods: [],
  tags: [],
};

const DEFAULT_UI: UIState = {
  activeChart: 'bar',
  activePeriod: 'month',
  activeCategoryFilter: null,
};

const sortCategories = (cats: Category[]): Category[] =>
  [...cats].sort((a, b) => {
    if (a.custom !== b.custom) return a.custom ? 1 : -1;
    return a.name.localeCompare(b.name);
  });

/**
 * Side-effect helper: for each active rule, insert any missed expense rows and
 * advance the rule's lastGenerated cursor. Returns what was created so callers
 * can update store state.
 */
async function materializeRecurring(
  rules: RecurringExpense[],
): Promise<{ newExpenses: Expense[]; updatedRules: RecurringExpense[] }> {
  const newExpenses: Expense[] = [];
  const updatedRules: RecurringExpense[] = [];
  const now = new Date();

  for (const rule of rules) {
    if (!rule.active) continue;
    const dates = computeOccurrences(rule, now);
    if (dates.length === 0) continue;

    for (const date of dates) {
      const e = await ExpensesRepo.create({
        amount: rule.amount,
        type: rule.type,
        categoryId: rule.categoryId,
        merchant: rule.merchant,
        paymentMethod: rule.paymentMethod,
        note: rule.note,
        tags: [],
        date,
        time: '00:00',
        source: 'recurring',
        status: 'confirmed',
        recurringId: rule.id,
      });
      newExpenses.push(e);
    }

    const last = dates[dates.length - 1];
    await RecurringRepo.markGenerated(rule.id, last);
    updatedRules.push({
      ...rule,
      lastGenerated: last,
      updatedAt: new Date().toISOString(),
    });
  }

  return { newExpenses, updatedRules };
}

export const useStore = create<StoreState & StoreActions>((set, get) => ({
  hydrated: false,
  expenses: [],
  categories: [],
  budgets: [],
  recurring: [],
  settings: DEFAULT_SETTINGS,
  filters: DEFAULT_FILTERS,
  ui: DEFAULT_UI,

  hydrate: async () => {
    const [categories, initialExpenses, budgets, recurring, settings] =
      await Promise.all([
        CategoriesRepo.list(),
        ExpensesRepo.list(),
        BudgetsRepo.list(),
        RecurringRepo.listActive(),
        SettingsRepo.get(),
      ]);

    // Catch up on missed occurrences from active recurring rules before
    // exposing data to the UI. New expense rows get inserted and rule cursors
    // advanced, then we re-list expenses + active rules to merge results.
    const { newExpenses, updatedRules } = await materializeRecurring(recurring);
    const expenses = [...newExpenses, ...initialExpenses].sort((a, b) => {
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return a.time > b.time ? -1 : 1;
    });
    const mergedRecurring = recurring.map(
      (r) => updatedRules.find((u) => u.id === r.id) ?? r,
    );

    set({
      categories,
      expenses,
      budgets,
      recurring: mergedRecurring,
      settings,
      ui: {
        ...DEFAULT_UI,
        activeChart: settings.defaultChart,
      },
      hydrated: true,
    });
  },

  runRecurringEngine: async () => {
    const rules = get().recurring.filter((r) => r.active);
    const { newExpenses, updatedRules } = await materializeRecurring(rules);
    if (newExpenses.length === 0 && updatedRules.length === 0) return;
    set((s) => {
      const expenses = [...newExpenses, ...s.expenses].sort((a, b) => {
        if (a.date !== b.date) return a.date > b.date ? -1 : 1;
        return a.time > b.time ? -1 : 1;
      });
      const recurring = s.recurring.map(
        (r) => updatedRules.find((u) => u.id === r.id) ?? r,
      );
      return { expenses, recurring };
    });
  },

  addExpense: async (input) => {
    const expense = await ExpensesRepo.create(input);
    set((s) => ({ expenses: [expense, ...s.expenses] }));
    return expense;
  },
  updateExpense: async (id, patch) => {
    await ExpensesRepo.update(id, patch);
    const now = new Date().toISOString();
    set((s) => ({
      expenses: s.expenses.map((e) =>
        e.id === id ? { ...e, ...patch, updatedAt: now } : e,
      ),
    }));
  },
  deleteExpense: async (id) => {
    await ExpensesRepo.delete(id);
    set((s) => ({ expenses: s.expenses.filter((e) => e.id !== id) }));
  },
  confirmExpense: async (id, patch) => {
    const merged: Partial<Omit<Expense, 'id' | 'createdAt'>> = {
      ...patch,
      status: 'confirmed',
    };
    await ExpensesRepo.update(id, merged);
    const now = new Date().toISOString();
    set((s) => ({
      expenses: s.expenses.map((e) =>
        e.id === id ? { ...e, ...merged, updatedAt: now } : e,
      ),
    }));
  },
  rejectExpense: async (id) => {
    await ExpensesRepo.update(id, { status: 'rejected' });
    const now = new Date().toISOString();
    set((s) => ({
      expenses: s.expenses.map((e) =>
        e.id === id ? { ...e, status: 'rejected', updatedAt: now } : e,
      ),
    }));
  },

  addCategory: async (input) => {
    const cat = await CategoriesRepo.create(input);
    set((s) => ({ categories: sortCategories([...s.categories, cat]) }));
    return cat;
  },
  updateCategory: async (id, patch) => {
    await CategoriesRepo.update(id, patch);
    const now = new Date().toISOString();
    set((s) => ({
      categories: sortCategories(
        s.categories.map((c) =>
          c.id === id ? { ...c, ...patch, updatedAt: now } : c,
        ),
      ),
    }));
  },
  deleteCategory: async (id) => {
    await CategoriesRepo.delete(id);
    set((s) => ({ categories: s.categories.filter((c) => c.id !== id) }));
  },

  addBudget: async (input) => {
    const b = await BudgetsRepo.create(input);
    set((s) => ({ budgets: [...s.budgets, b] }));
    return b;
  },
  updateBudget: async (id, patch) => {
    await BudgetsRepo.update(id, patch);
    const now = new Date().toISOString();
    set((s) => ({
      budgets: s.budgets.map((b) =>
        b.id === id ? { ...b, ...patch, updatedAt: now } : b,
      ),
    }));
  },
  deleteBudget: async (id) => {
    await BudgetsRepo.delete(id);
    set((s) => ({ budgets: s.budgets.filter((b) => b.id !== id) }));
  },

  addRecurring: async (input) => {
    const r = await RecurringRepo.create(input);
    set((s) => ({ recurring: [r, ...s.recurring] }));
    return r;
  },
  updateRecurring: async (id, patch) => {
    await RecurringRepo.update(id, patch);
    const now = new Date().toISOString();
    set((s) => ({
      recurring: s.recurring.map((r) =>
        r.id === id ? { ...r, ...patch, updatedAt: now } : r,
      ),
    }));
  },
  deleteRecurring: async (id) => {
    await RecurringRepo.delete(id);
    set((s) => ({ recurring: s.recurring.filter((r) => r.id !== id) }));
  },

  updateSettings: async (patch) => {
    const next = await SettingsRepo.update(patch);
    set({ settings: next });
  },

  setFilters: (patch) =>
    set((s) => ({ filters: { ...s.filters, ...patch } })),
  setActiveChart: (chart) =>
    set((s) => ({ ui: { ...s.ui, activeChart: chart } })),
  setActivePeriod: (period) =>
    set((s) => ({ ui: { ...s.ui, activePeriod: period } })),
  setActiveCategoryFilter: (categoryId) =>
    set((s) => ({ ui: { ...s.ui, activeCategoryFilter: categoryId } })),
}));
