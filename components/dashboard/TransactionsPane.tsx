import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { groupByDate } from '@/lib/domain/dates';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Category, Expense } from '@/lib/types';

import { DateGroupHeader } from './DateGroupHeader';
import { TxnRow } from './TxnRow';

type TransactionsPaneProps = {
  /** Expenses already filtered for the active period + filters by the parent */
  expenses: Expense[];
  onPressExpense?: (expense: Expense) => void;
};

export function TransactionsPane({
  expenses,
  onPressExpense,
}: TransactionsPaneProps) {
  const { palette } = useTheme();
  const categories = useStore((s) => s.categories);
  const density = useStore((s) => s.settings.density);
  const styles = makeStyles(palette);

  const categoriesById = useMemo<Map<string, Category>>(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const groups = useMemo(() => {
    // groupByDate preserves order; sort expenses newest-first first so dates
    // come out in the right order.
    const sorted = [...expenses].sort((a, b) => {
      if (a.date !== b.date) return a.date > b.date ? -1 : 1;
      return a.time > b.time ? -1 : 1;
    });
    return groupByDate(sorted);
  }, [expenses]);

  if (expenses.length === 0) {
    return (
      <Card padding={28} radius={20} elevation="sm">
        <View style={styles.empty}>
          <Text style={styles.emptyText}>No transactions yet</Text>
          <Text style={styles.emptyHint}>Tap + to add your first one</Text>
        </View>
      </Card>
    );
  }

  return (
    <View style={styles.pane}>
      <View style={styles.titleRow}>
        <Text style={styles.title}>Transactions</Text>
        <Text style={styles.count}>{expenses.length}</Text>
      </View>
      {Array.from(groups.entries()).map(([date, rows]) => {
        const dailyTotal = rows.reduce(
          (sum, e) => sum + (e.type === 'expense' ? e.amount : 0),
          0,
        );
        return (
          <Card
            key={date}
            padding={0}
            radius={16}
            elevation="sm"
            style={styles.groupCard}
          >
            <DateGroupHeader date={date} dailyTotal={dailyTotal} />
            {rows.map((expense, i) => (
              <TxnRow
                key={expense.id}
                expense={expense}
                category={categoriesById.get(expense.categoryId)}
                density={density}
                isLast={i === rows.length - 1}
                onPress={onPressExpense}
              />
            ))}
          </Card>
        );
      })}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    pane: {
      gap: 12,
    },
    titleRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
      gap: 8,
      paddingHorizontal: 4,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 20,
      color: palette.ink,
      letterSpacing: -0.4,
    },
    count: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: palette.inkMuted,
    },
    groupCard: {
      overflow: 'hidden',
    },
    empty: {
      alignItems: 'center',
      gap: 4,
    },
    emptyText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: palette.inkMuted,
    },
    emptyHint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: palette.inkSoft,
    },
  });
}
