import { randomUUID } from 'expo-crypto';

import type {
  Expense,
  Filters,
  PaymentMethod,
  Source,
  TxnType,
} from '@/lib/types';

import { getDatabase } from '../database';

type ExpenseRow = {
  id: string;
  amount: number;
  type: string;
  category_id: string;
  merchant: string | null;
  payment_method: string;
  note: string | null;
  tags: string;
  date: string;
  time: string;
  source: string;
  recurring_id: string | null;
  created_at: string;
  updated_at: string;
};

const rowToExpense = (r: ExpenseRow): Expense => ({
  id: r.id,
  amount: r.amount,
  type: r.type as TxnType,
  categoryId: r.category_id,
  merchant: r.merchant,
  paymentMethod: r.payment_method as PaymentMethod,
  note: r.note,
  tags: safeParseStringArray(r.tags),
  date: r.date,
  time: r.time,
  source: r.source as Source,
  recurringId: r.recurring_id,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

function safeParseStringArray(s: string): string[] {
  try {
    const parsed = JSON.parse(s) as unknown;
    return Array.isArray(parsed)
      ? parsed.filter((v): v is string => typeof v === 'string')
      : [];
  } catch {
    return [];
  }
}

type SqlParam = string | number | null;

export const ExpensesRepo = {
  async create(
    input: Omit<Expense, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Expense> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const expense: Expense = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await db.runAsync(
      `INSERT INTO expenses
         (id, amount, type, category_id, merchant, payment_method, note,
          tags, date, time, source, recurring_id, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        expense.id,
        expense.amount,
        expense.type,
        expense.categoryId,
        expense.merchant,
        expense.paymentMethod,
        expense.note,
        JSON.stringify(expense.tags),
        expense.date,
        expense.time,
        expense.source,
        expense.recurringId,
        expense.createdAt,
        expense.updatedAt,
      ],
    );
    return expense;
  },

  async get(id: string): Promise<Expense | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<ExpenseRow>(
      'SELECT * FROM expenses WHERE id = ?',
      [id],
    );
    return row ? rowToExpense(row) : null;
  },

  async update(
    id: string,
    patch: Partial<Omit<Expense, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ['updated_at = ?'];
    const params: SqlParam[] = [new Date().toISOString()];

    const set = (col: string, value: SqlParam) => {
      fields.push(`${col} = ?`);
      params.push(value);
    };

    if (patch.amount !== undefined) set('amount', patch.amount);
    if (patch.type !== undefined) set('type', patch.type);
    if (patch.categoryId !== undefined) set('category_id', patch.categoryId);
    if (patch.merchant !== undefined) set('merchant', patch.merchant);
    if (patch.paymentMethod !== undefined) set('payment_method', patch.paymentMethod);
    if (patch.note !== undefined) set('note', patch.note);
    if (patch.tags !== undefined) set('tags', JSON.stringify(patch.tags));
    if (patch.date !== undefined) set('date', patch.date);
    if (patch.time !== undefined) set('time', patch.time);
    if (patch.source !== undefined) set('source', patch.source);
    if (patch.recurringId !== undefined) set('recurring_id', patch.recurringId);

    params.push(id);
    await db.runAsync(
      `UPDATE expenses SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM expenses WHERE id = ?', [id]);
  },

  async list(filters: Partial<Filters> = {}): Promise<Expense[]> {
    const db = await getDatabase();
    const where: string[] = [];
    const params: SqlParam[] = [];

    if (filters.startDate) {
      where.push('date >= ?');
      params.push(filters.startDate);
    }
    if (filters.endDate) {
      where.push('date <= ?');
      params.push(filters.endDate);
    }
    if (filters.categoryIds?.length) {
      const placeholders = filters.categoryIds.map(() => '?').join(', ');
      where.push(`category_id IN (${placeholders})`);
      params.push(...filters.categoryIds);
    }
    if (filters.paymentMethods?.length) {
      const placeholders = filters.paymentMethods.map(() => '?').join(', ');
      where.push(`payment_method IN (${placeholders})`);
      params.push(...filters.paymentMethods);
    }
    if (filters.minAmount !== undefined) {
      where.push('amount >= ?');
      params.push(filters.minAmount);
    }
    if (filters.maxAmount !== undefined) {
      where.push('amount <= ?');
      params.push(filters.maxAmount);
    }

    const whereSQL = where.length ? `WHERE ${where.join(' AND ')}` : '';
    const rows = await db.getAllAsync<ExpenseRow>(
      `SELECT * FROM expenses ${whereSQL} ORDER BY date DESC, time DESC`,
      params,
    );
    return rows.map(rowToExpense);
  },

  async recentN(n: number): Promise<Expense[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<ExpenseRow>(
      'SELECT * FROM expenses ORDER BY date DESC, time DESC LIMIT ?',
      [n],
    );
    return rows.map(rowToExpense);
  },

  /**
   * Returns total expense amount per category between [start, end] inclusive.
   * Income rows are excluded.
   */
  async sumByCategory(
    start: string,
    end: string,
  ): Promise<Map<string, number>> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<{ category_id: string; total: number }>(
      `SELECT category_id, SUM(amount) as total
         FROM expenses
        WHERE type = 'expense' AND date >= ? AND date <= ?
        GROUP BY category_id`,
      [start, end],
    );
    return new Map(rows.map((r) => [r.category_id, r.total]));
  },

  async search(text: string): Promise<Expense[]> {
    const db = await getDatabase();
    const pattern = `%${text}%`;
    const rows = await db.getAllAsync<ExpenseRow>(
      `SELECT * FROM expenses
        WHERE merchant LIKE ? OR note LIKE ?
        ORDER BY date DESC, time DESC
        LIMIT 200`,
      [pattern, pattern],
    );
    return rows.map(rowToExpense);
  },
};
