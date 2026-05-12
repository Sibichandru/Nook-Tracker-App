import type { Category } from '@/lib/types';

export type DefaultCategory = Omit<Category, 'id' | 'createdAt' | 'updatedAt'>;

/**
 * Default categories seeded on first launch. Colors come from the Paisa
 * design's CAT_COLOR map; icons match PIcon names. `custom: false` distinguishes
 * built-ins from user-created categories in the management UI.
 */
export const DEFAULT_CATEGORIES: DefaultCategory[] = [
  { name: 'Food', icon: 'food', color: '#E07A5F', custom: false },
  { name: 'Transport', icon: 'transport', color: '#4E8098', custom: false },
  { name: 'Shopping', icon: 'shopping', color: '#9B6BCF', custom: false },
  { name: 'Home', icon: 'home', color: '#C78A1A', custom: false },
  { name: 'Bills', icon: 'bills', color: '#7B8C4A', custom: false },
  { name: 'Fun', icon: 'fun', color: '#D36FA2', custom: false },
  { name: 'Health', icon: 'health', color: '#3C9D8E', custom: false },
  { name: 'Salary', icon: 'salary', color: '#0E8A5F', custom: false },
  { name: 'Travel', icon: 'travel', color: '#5B6BE1', custom: false },
  { name: 'Coffee', icon: 'coffee', color: '#8D6748', custom: false },
  { name: 'Other', icon: 'wallet', color: '#8B8E94', custom: false },
];
