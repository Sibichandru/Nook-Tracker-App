import { useMemo } from 'react';
import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import {
  dailyTotals,
  topCategoryBuckets,
} from '@/lib/domain/charts';
import { formatINR } from '@/lib/domain/currency';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Category, ChartKind, Expense } from '@/lib/types';

import { ChartDropdown } from './ChartDropdown';
import { ChartPlaceholder } from './ChartPlaceholder';
import { BarChart } from './charts/BarChart';
import { DonutChart } from './charts/DonutChart';

type HeroCardProps = {
  label: string;
  total: number;
  /** Percentage change vs previous period, or null if previous period had no data */
  trendPct: number | null;
  /** Expenses already filtered for the active period */
  expenses: Expense[];
};

export function HeroCard({ label, total, trendPct, expenses }: HeroCardProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const activeChart = useStore((s) => s.ui.activeChart);
  const setActiveChart = useStore((s) => s.setActiveChart);
  const categories = useStore((s) => s.categories);

  const categoriesById = useMemo<Map<string, Category>>(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const chart = useMemo(
    () => renderChart(activeChart, expenses, categoriesById),
    [activeChart, expenses, categoriesById],
  );

  const trendIsUp = trendPct !== null && trendPct > 0;
  const trendColor = trendIsUp ? palette.negative : palette.positive;

  return (
    <Card style={styles.card} padding={20} radius={20} elevation="sm">
      <View style={styles.header}>
        <View style={styles.totalCol}>
          <Text style={styles.label}>{label}</Text>
          <Text style={styles.amount}>{formatINR(total)}</Text>
          {trendPct !== null ? (
            <View style={styles.trend}>
              <Text style={[styles.trendArrow, { color: trendColor }]}>
                {trendIsUp ? '↑' : '↓'}
              </Text>
              <Text style={[styles.trendText, { color: trendColor }]}>
                {Math.abs(trendPct).toFixed(0)}% vs last
              </Text>
            </View>
          ) : null}
        </View>
        <ChartDropdown value={activeChart} onChange={setActiveChart} />
      </View>
      {chart}
    </Card>
  );
}

function renderChart(
  kind: ChartKind,
  expenses: Expense[],
  categoriesById: Map<string, Category>,
) {
  switch (kind) {
    case 'bar': {
      const data = dailyTotals(expenses);
      return <BarChart data={data} />;
    }
    case 'donut': {
      const buckets = topCategoryBuckets(expenses, categoriesById);
      return <DonutChart buckets={buckets} />;
    }
    default:
      // line + budget arrive in iter 14
      return <ChartPlaceholder />;
  }
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    card: {
      gap: 16,
    },
    header: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'flex-start',
    },
    totalCol: {
      gap: 4,
    },
    label: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: palette.inkMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
    },
    amount: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 38,
      color: palette.ink,
      letterSpacing: -0.8,
    },
    trend: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      marginTop: 2,
    },
    trendArrow: {
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
    },
    trendText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12.5,
    },
  });
}
