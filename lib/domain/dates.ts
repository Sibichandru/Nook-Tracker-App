/**
 * Date helpers. `fmtDay` is ported from the Paisa design's tokens.jsx and
 * produces 'Today' / 'Yesterday' / 'Wed, 22 Apr' style labels in en-IN locale.
 */

const toISODate = (d: Date): string => d.toISOString().split('T')[0];

export function fmtDay(iso: string): string {
  const today = new Date();
  const d = new Date(iso);
  if (toISODate(d) === toISODate(today)) return 'Today';
  const yest = new Date(today);
  yest.setDate(today.getDate() - 1);
  if (toISODate(d) === toISODate(yest)) return 'Yesterday';
  return d.toLocaleDateString('en-IN', {
    weekday: 'short',
    day: 'numeric',
    month: 'short',
  });
}

/**
 * Group items by `date` field preserving insertion order. Assumes items are
 * already sorted (newest-first is typical for transactions).
 */
export function groupByDate<T extends { date: string }>(
  items: T[],
): Map<string, T[]> {
  const map = new Map<string, T[]>();
  for (const item of items) {
    const arr = map.get(item.date);
    if (arr) arr.push(item);
    else map.set(item.date, [item]);
  }
  return map;
}
