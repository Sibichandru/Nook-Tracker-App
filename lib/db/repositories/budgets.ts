import { randomUUID } from 'expo-crypto';

import type { Budget } from '@/lib/types';

import { getDatabase } from '../database';

type BudgetRow = {
  id: string;
  type: string;
  category_id: string | null;
  amount: number;
  period_type: string;
  warn_threshold: number;
  created_at: string;
  updated_at: string;
};

const rowToBudget = (r: BudgetRow): Budget => ({
  id: r.id,
  type: r.type as Budget['type'],
  categoryId: r.category_id,
  amount: r.amount,
  periodType: r.period_type as Budget['periodType'],
  warnThreshold: r.warn_threshold,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

type SqlParam = string | number | null;

export const BudgetsRepo = {
  async create(
    input: Omit<Budget, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Budget> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const budget: Budget = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await db.runAsync(
      `INSERT INTO budgets
         (id, type, category_id, amount, period_type, warn_threshold,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        budget.id,
        budget.type,
        budget.categoryId,
        budget.amount,
        budget.periodType,
        budget.warnThreshold,
        budget.createdAt,
        budget.updatedAt,
      ],
    );
    return budget;
  },

  async get(id: string): Promise<Budget | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<BudgetRow>(
      'SELECT * FROM budgets WHERE id = ?',
      [id],
    );
    return row ? rowToBudget(row) : null;
  },

  async update(
    id: string,
    patch: Partial<Omit<Budget, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ['updated_at = ?'];
    const params: SqlParam[] = [new Date().toISOString()];

    const set = (col: string, value: SqlParam) => {
      fields.push(`${col} = ?`);
      params.push(value);
    };

    if (patch.type !== undefined) set('type', patch.type);
    if (patch.categoryId !== undefined) set('category_id', patch.categoryId);
    if (patch.amount !== undefined) set('amount', patch.amount);
    if (patch.periodType !== undefined) set('period_type', patch.periodType);
    if (patch.warnThreshold !== undefined) set('warn_threshold', patch.warnThreshold);

    params.push(id);
    await db.runAsync(
      `UPDATE budgets SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM budgets WHERE id = ?', [id]);
  },

  async list(): Promise<Budget[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<BudgetRow>(
      'SELECT * FROM budgets ORDER BY type ASC, category_id ASC',
    );
    return rows.map(rowToBudget);
  },

  async getOverall(): Promise<Budget | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<BudgetRow>(
      "SELECT * FROM budgets WHERE type = 'overall' LIMIT 1",
    );
    return row ? rowToBudget(row) : null;
  },

  async listPerCategory(): Promise<Budget[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<BudgetRow>(
      "SELECT * FROM budgets WHERE type = 'category' ORDER BY category_id ASC",
    );
    return rows.map(rowToBudget);
  },
};
