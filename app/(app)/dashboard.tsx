import { useMemo, useRef } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  useAnimatedScrollHandler,
  useAnimatedStyle,
  useSharedValue,
} from 'react-native-reanimated';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AddTxnSheet,
  type AddTxnSheetRef,
} from '@/components/addTxn/AddTxnSheet';
import { DashTopBar } from '@/components/dashboard/DashTopBar';
import { FilterChips } from '@/components/dashboard/FilterChips';
import { FilterSheet, type FilterSheetRef } from '@/components/dashboard/FilterSheet';
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

const HERO_FADE_DISTANCE = 360;

export default function DashboardScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const expenses = useStore((s) => s.expenses);
  const activePeriod = useStore((s) => s.ui.activePeriod);
  const activeCategoryFilter = useStore((s) => s.ui.activeCategoryFilter);

  const now = new Date();
  const { start, end } = useMemo(
    () => rangeFor(activePeriod, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePeriod, now.toDateString()],
  );
  const prev = useMemo(
    () => previousRange(activePeriod, now),
    // eslint-disable-next-line react-hooks/exhaustive-deps
    [activePeriod, now.toDateString()],
  );

  // Pending rows live in the pending tray (iter 32). Hero card, transactions
  // pane, and trend math all count confirmed spend only.
  const expensesInPeriod = useMemo(
    () =>
      expenses.filter((e) => {
        if (e.status !== 'confirmed') return false;
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
            e.status === 'confirmed' &&
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

  // Shared scroll offset drives the hero fade/translate and topbar border.
  const scrollY = useSharedValue(0);
  const scrollHandler = useAnimatedScrollHandler({
    onScroll: (event) => {
      scrollY.value = event.contentOffset.y;
    },
  });

  const heroAnimStyle = useAnimatedStyle(() => {
    const opacity = interpolate(
      scrollY.value,
      [0, HERO_FADE_DISTANCE * 0.8],
      [1, 0],
      Extrapolation.CLAMP,
    );
    const translateY = interpolate(
      scrollY.value,
      [0, HERO_FADE_DISTANCE],
      [0, -80],
      Extrapolation.CLAMP,
    );
    return { opacity, transform: [{ translateY }] };
  });

  const sheetRef = useRef<AddTxnSheetRef>(null);
  const filterSheetRef = useRef<FilterSheetRef>(null);
  const handleAddExpense = () => sheetRef.current?.openCreate();
  const handleTxnPress = (expense: Expense) =>
    sheetRef.current?.openEdit(expense);

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <DashTopBar scrollY={scrollY} />
      <Animated.ScrollView
        onScroll={scrollHandler}
        scrollEventThrottle={16}
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <PeriodBar />
        <Animated.View style={heroAnimStyle}>
          <HeroCard
            label={label}
            total={total}
            trendPct={trendPct}
            expenses={expensesInPeriod}
          />
        </Animated.View>
        <FilterChips filterSheetRef={filterSheetRef} />
        <TransactionsPane
          expenses={expensesInPeriod}
          onPressExpense={handleTxnPress}
        />
        <View style={styles.tailSpacer} />
      </Animated.ScrollView>
      <View style={styles.fabPin}>
        <FAB onPress={handleAddExpense} accessibilityLabel="Add transaction" />
      </View>
      <AddTxnSheet ref={sheetRef} />
      <FilterSheet ref={filterSheetRef} />
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
