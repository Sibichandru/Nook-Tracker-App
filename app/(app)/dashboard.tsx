import { Alert, ScrollView, StyleSheet, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DashTopBar } from '@/components/dashboard/DashTopBar';
import { HeroCard } from '@/components/dashboard/HeroCard';
import { PeriodBar } from '@/components/dashboard/PeriodBar';
import { FAB } from '@/components/ui/FAB';
import {
  currentPeriodLabel,
  previousRange,
  rangeFor,
} from '@/lib/domain/periods';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

export default function DashboardScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const expenses = useStore((s) => s.expenses);
  const activePeriod = useStore((s) => s.ui.activePeriod);

  const now = new Date();
  const { start, end } = rangeFor(activePeriod, now);
  const prev = previousRange(activePeriod, now);

  const total = expenses
    .filter(
      (e) => e.type === 'expense' && e.date >= start && e.date <= end,
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const prevTotal = expenses
    .filter(
      (e) =>
        e.type === 'expense' && e.date >= prev.start && e.date <= prev.end,
    )
    .reduce((sum, e) => sum + e.amount, 0);

  const trendPct =
    prevTotal > 0 ? ((total - prevTotal) / prevTotal) * 100 : null;

  const label = currentPeriodLabel(activePeriod, now);

  const handleAddExpense = () => {
    // Real bottom sheet wires up in iter 18.
    Alert.alert('Add transaction', 'Sheet coming in iter 18');
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
      height: 200,
    },
    fabPin: {
      position: 'absolute',
      right: 18,
      bottom: 22,
    },
  });
}
