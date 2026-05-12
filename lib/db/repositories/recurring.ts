import { randomUUID } from 'expo-crypto';

import type {
  Frequency,
  PaymentMethod,
  RecurringExpense,
  TxnType,
} from '@/lib/types';

import { getDatabase } from '../database';

type RecurringRow = {
  id: string;
  amount: number;
  type: string;
  category_id: string;
  merchant: string;
  payment_method: string;
  note: string | null;
  frequency: string;
  start_date: string;
  next_occurrence: string;
  last_generated: string | null;
  active: number;
  created_at: string;
  updated_at: string;
};

const rowToRecurring = (r: RecurringRow): RecurringExpense => ({
  id: r.id,
  amount: r.amount,
  type: r.type as TxnType,
  categoryId: r.category_id,
  merchant: r.merchant,
  paymentMethod: r.payment_method as PaymentMethod,
  note: r.note,
  frequency: r.frequency as Frequency,
  startDate: r.start_date,
  nextOccurrence: r.next_occurrence,
  lastGenerated: r.last_generated,
  active: r.active === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

type SqlParam = string | number | null;

export const RecurringRepo = {
  async create(
    input: Omit<RecurringExpense, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<RecurringExpense> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const rule: RecurringExpense = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await db.runAsync(
      `INSERT INTO recurring_expenses
         (id, amount, type, category_id, merchant, payment_method, note,
          frequency, start_date, next_occurrence, last_generated, active,
          created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?, ?)`,
      [
        rule.id,
        rule.amount,
        rule.type,
        rule.categoryId,
        rule.merchant,
        rule.paymentMethod,
        rule.note,
        rule.frequency,
        rule.startDate,
        rule.nextOccurrence,
        rule.lastGenerated,
        rule.active ? 1 : 0,
        rule.createdAt,
        rule.updatedAt,
      ],
    );
    return rule;
  },

  async get(id: string): Promise<RecurringExpense | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<RecurringRow>(
      'SELECT * FROM recurring_expenses WHERE id = ?',
      [id],
    );
    return row ? rowToRecurring(row) : null;
  },

  async update(
    id: string,
    patch: Partial<Omit<RecurringExpense, 'id' | 'createdAt'>>,
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
    if (patch.frequency !== undefined) set('frequency', patch.frequency);
    if (patch.startDate !== undefined) set('start_date', patch.startDate);
    if (patch.nextOccurrence !== undefined) set('next_occurrence', patch.nextOccurrence);
    if (patch.lastGenerated !== undefined) set('last_generated', patch.lastGenerated);
    if (patch.active !== undefined) set('active', patch.active ? 1 : 0);

    params.push(id);
    await db.runAsync(
      `UPDATE recurring_expenses SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM recurring_expenses WHERE id = ?', [id]);
  },

  async list(): Promise<RecurringExpense[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<RecurringRow>(
      'SELECT * FROM recurring_expenses ORDER BY active DESC, next_occurrence ASC',
    );
    return rows.map(rowToRecurring);
  },

  async listActive(): Promise<RecurringExpense[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<RecurringRow>(
      'SELECT * FROM recurring_expenses WHERE active = 1 ORDER BY next_occurrence ASC',
    );
    return rows.map(rowToRecurring);
  },

  async markGenerated(id: string, isoDate: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync(
      `UPDATE recurring_expenses
          SET last_generated = ?,
              updated_at = ?
        WHERE id = ?`,
      [isoDate, new Date().toISOString(), id],
    );
  },
};
