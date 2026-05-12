/**
 * Helpers that resolve a Category to its PIcon name + display color. Categories
 * store both fields already, but the icon column is `string` in SQL; this layer
 * narrows it to the typed PIconName union with a safe fallback.
 */

import { ALL_PICON_NAMES, type PIconName } from '@/components/ui/PIcon';
import type { Category } from '@/lib/types';

const ICON_SET = new Set<string>(ALL_PICON_NAMES);

const isPIconName = (s: string): s is PIconName => ICON_SET.has(s);

export function categoryIcon(category: Pick<Category, 'icon'>): PIconName {
  return isPIconName(category.icon) ? category.icon : 'wallet';
}

export function categoryColor(category: Pick<Category, 'color'>): string {
  return category.color;
}
