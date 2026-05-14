import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { useStore } from '@/lib/store';
import { useAccent, type Palette, useTheme } from '@/lib/theme';
import type { Category, Expense } from '@/lib/types';

import { PendingRow } from './PendingRow';

type PendingTrayProps = {
  pending: Expense[];
  onReview: (expense: Expense) => void;
};

/**
 * Tray surfaces auto-detected (`status: 'pending'`) rows above the dashboard
 * timeline. Hero card totals exclude these — they only count once the user
 * confirms them. Hidden entirely when there's nothing to review.
 */
export function PendingTray({ pending, onReview }: PendingTrayProps) {
  const { palette } = useTheme();
  const accent = useAccent();
  const categories = useStore((s) => s.categories);
  const styles = makeStyles(palette, accent.base);

  const categoriesById = useMemo<Map<string, Category>>(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  if (pending.length === 0) return null;

  return (
    <Card style={styles.card} padding={0} radius={16} elevation="sm">
      <View style={styles.header}>
        <Text style={styles.title}>To review</Text>
        <View style={styles.badge}>
          <Text style={styles.badgeText}>{pending.length}</Text>
        </View>
      </View>
      {pending.map((expense, i) => (
        <PendingRow
          key={expense.id}
          expense={expense}
          category={categoriesById.get(expense.categoryId)}
          isLast={i === pending.length - 1}
          onReview={onReview}
        />
      ))}
    </Card>
  );
}

function makeStyles(palette: Palette, accentBase: string) {
  return StyleSheet.create({
    card: {
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: `${accentBase}55`,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
    },
    title: {
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
      letterSpacing: 0.4,
      color: palette.inkMuted,
      textTransform: 'uppercase',
    },
    badge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 8,
      borderRadius: 11,
      backgroundColor: accentBase,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      color: '#FFFFFF',
    },
  });
}
