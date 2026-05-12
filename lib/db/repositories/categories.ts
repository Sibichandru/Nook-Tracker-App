import { randomUUID } from 'expo-crypto';

import type { Category } from '@/lib/types';

import { getDatabase } from '../database';

type CategoryRow = {
  id: string;
  name: string;
  icon: string;
  color: string;
  custom: number;
  created_at: string;
  updated_at: string;
};

const rowToCategory = (r: CategoryRow): Category => ({
  id: r.id,
  name: r.name,
  icon: r.icon,
  color: r.color,
  custom: r.custom === 1,
  createdAt: r.created_at,
  updatedAt: r.updated_at,
});

export const CategoriesRepo = {
  async create(
    input: Omit<Category, 'id' | 'createdAt' | 'updatedAt'>,
  ): Promise<Category> {
    const db = await getDatabase();
    const now = new Date().toISOString();
    const cat: Category = {
      ...input,
      id: randomUUID(),
      createdAt: now,
      updatedAt: now,
    };
    await db.runAsync(
      `INSERT INTO categories
         (id, name, icon, color, custom, created_at, updated_at)
       VALUES (?, ?, ?, ?, ?, ?, ?)`,
      [
        cat.id,
        cat.name,
        cat.icon,
        cat.color,
        cat.custom ? 1 : 0,
        cat.createdAt,
        cat.updatedAt,
      ],
    );
    return cat;
  },

  async get(id: string): Promise<Category | null> {
    const db = await getDatabase();
    const row = await db.getFirstAsync<CategoryRow>(
      'SELECT * FROM categories WHERE id = ?',
      [id],
    );
    return row ? rowToCategory(row) : null;
  },

  async update(
    id: string,
    patch: Partial<Omit<Category, 'id' | 'createdAt'>>,
  ): Promise<void> {
    const db = await getDatabase();
    const fields: string[] = ['updated_at = ?'];
    const params: (string | number)[] = [new Date().toISOString()];
    if (patch.name !== undefined) {
      fields.push('name = ?');
      params.push(patch.name);
    }
    if (patch.icon !== undefined) {
      fields.push('icon = ?');
      params.push(patch.icon);
    }
    if (patch.color !== undefined) {
      fields.push('color = ?');
      params.push(patch.color);
    }
    if (patch.custom !== undefined) {
      fields.push('custom = ?');
      params.push(patch.custom ? 1 : 0);
    }
    params.push(id);
    await db.runAsync(
      `UPDATE categories SET ${fields.join(', ')} WHERE id = ?`,
      params,
    );
  },

  async delete(id: string): Promise<void> {
    const db = await getDatabase();
    await db.runAsync('DELETE FROM categories WHERE id = ?', [id]);
  },

  /**
   * Returns categories sorted built-ins first, then alphabetical.
   */
  async list(): Promise<Category[]> {
    const db = await getDatabase();
    const rows = await db.getAllAsync<CategoryRow>(
      'SELECT * FROM categories ORDER BY custom ASC, name ASC',
    );
    return rows.map(rowToCategory);
  },
};
