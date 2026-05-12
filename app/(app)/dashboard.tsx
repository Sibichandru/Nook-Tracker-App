import { useMemo } from 'react';
import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashTopBar } from '@/components/dashboard/DashTopBar';
import { HeroCard } from '@/components/dashboard/HeroCard';
import { PeriodBar } from '@/components/dashboard/PeriodBar';
import { TransactionsPane } from '@/components/dashboard/TransactionsPane';
import { FAB } from '@/components/ui/FAB';
import {
  currentPeriodLabel,
  previousRange,
  rangeFor,
} from '@/lib/domain/periods';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Expense } from '@/lib/types';

export default function DashboardScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const expenses = useStore((s) => s.expenses);
  const activePeriod = useStore((s) => s.ui.activePeriod);
  const activeCategoryFilter = useStore((s) => s.ui.activeCategoryFilter);

  const now = new Date();
  const { start, end } = useMemo(
    () => rangeFor(activePeriod, now),
    // `now` recomputes on every render; the values stabilize per period change.
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePeriod, now.toDateString()],
  );
  const prev = useMemo(
    () => previousRange(activePeriod, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePeriod, now.toDateString()],
  );

  const expensesInPeriod = useMemo(
    () =>
      expenses.filter((e) => {
        if (e.date < start || e.date > end) return false;
        if (activeCategoryFilter && e.categoryId !== activeCategoryFilter) {
          return false;
        }
        return true;
      }),
    [expenses, start, end, activeCategoryFilter],
  );

  const total = useMemo(
    () =>
      expensesInPeriod
        .filter((e) => e.type === 'expense')
        .reduce((sum, e) => sum + e.amount, 0),
    [expensesInPeriod],
  );

  const prevTotal = useMemo(
    () =>
      expenses
        .filter(
          (e) =>
            e.type === 'expense' &&
            e.date >= prev.start &&
            e.date <= prev.end,
        )
        .reduce((sum, e) => sum + e.amount, 0),
    [expenses, prev.start, prev.end],
  );

  const trendPct =
    prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  const label = currentPeriodLabel(activePeriod, now);

  const handleAddExpense = () => {
    // Real bottom sheet wires up in iter 18.
    Alert.alert('Add transaction', 'Sheet coming in iter 18');
  };

  const handleTxnPress = (_e: Expense) => {
    // Edit flow wires up in iter 20.
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashTopBar />
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <PeriodBar />
        <HeroCard label={label} total={total} trendPct={trendPct} />
        <TransactionsPane
          expenses={expensesInPeriod}
          onPressExpense={handleTxnPress}
        />
        <View style={styles.tailSpacer} />
      </ScrollView>
      <View style={styles.fabPin}>
        <FAB onPress={handleAddExpense} accessibilityLabel="Add transaction" />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 14,
      paddingBottom: 120,
    },
    tailSpacer: {
      height: 40,
    },
    fabPin: {
      position: 'absolute',
      right: 18,
      bottom: 22,
    },
  });
}
