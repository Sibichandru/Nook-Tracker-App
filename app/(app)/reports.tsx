import { router } from 'expo-router';
import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { DonutChart } from '@/components/dashboard/charts/DonutChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { RangePicker, RANGE_DAYS, type RangeKey } from '@/components/reports/RangePicker';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { PIcon } from '@/components/ui/PIcon';
import {
  categoryColor,
  categoryIcon,
} from '@/components/ui/categoryVisuals';
import {
  monthlyTotalsAsDaily,
  topCategoryBuckets,
} from '@/lib/domain/charts';
import { formatINR } from '@/lib/domain/currency';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Category } from '@/lib/types';

const isoDaysAgo = (n: number): string => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d.toISOString().slice(0, 10);
};
const isoToday = (): string => new Date().toISOString().slice(0, 10);

export default function ReportsScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const [range, setRange] = useState<RangeKey>('30d');

  const expenses = useStore((s) => s.expenses);
  const categories = useStore((s) => s.categories);

  const categoriesById = useMemo<Map<string, Category>>(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  const days = RANGE_DAYS[range];
  const start = isoDaysAgo(days - 1);
  const end = isoToday();

  const inRange = useMemo(
    () =>
      expenses.filter(
        (e) => e.type === 'expense' && e.date >= start && e.date <= end,
      ),
    [expenses, start, end],
  );

  const total = useMemo(
    () => inRange.reduce((sum, e) => sum + e.amount, 0),
    [inRange],
  );

  const avgPerDay = days > 0 ? total / days : 0;

  const buckets = useMemo(
    () => topCategoryBuckets(inRange, categoriesById, 999),
    [inRange, categoriesById],
  );

  const monthlyData = useMemo(
    () => monthlyTotalsAsDaily(expenses, 6),
    [expenses],
  );

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <PIcon name="back" size={22} color={palette.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Reports</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <RangePicker value={range} onChange={setRange} />

        <Card padding={20} radius={20} elevation="sm">
          <View style={styles.summaryRow}>
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>TOTAL</Text>
              <Text style={styles.summaryAmount}>{formatINR(total)}</Text>
            </View>
            <View style={styles.summaryDivider} />
            <View style={styles.summaryItem}>
              <Text style={styles.summaryLabel}>AVG / DAY</Text>
              <Text style={styles.summaryAmount}>
                {formatINR(Math.round(avgPerDay))}
              </Text>
            </View>
          </View>
        </Card>

        <Section title="By category" palette={palette}>
          <Card padding={16} radius={16} elevation="sm">
            {buckets.length > 0 ? (
              <DonutChart buckets={buckets.slice(0, 6)} />
            ) : (
              <View style={styles.empty}>
                <Text style={styles.emptyText}>
                  No expenses in this range yet.
                </Text>
              </View>
            )}
          </Card>
        </Section>

        {buckets.length > 0 ? (
          <Section title="Breakdown" palette={palette}>
            <Card padding={4} radius={14} elevation="sm">
              {buckets.map((b) => {
                const cat = categoriesById.get(b.categoryId);
                const percentage = total > 0 ? (b.amount / total) * 100 : 0;
                return (
                  <View key={b.categoryId} style={styles.bucketRow}>
                    {cat ? (
                      <IconCircle
                        name={categoryIcon(cat)}
                        color={categoryColor(cat)}
                        size={28}
                      />
                    ) : (
                      <View style={styles.swatch} />
                    )}
                    <View style={styles.bucketText}>
                      <Text style={styles.bucketName}>{b.name}</Text>
                      <Text style={styles.bucketPct}>
                        {percentage.toFixed(1)}%
                      </Text>
                    </View>
                    <Text style={styles.bucketAmount}>
                      {formatINR(b.amount)}
                    </Text>
                  </View>
                );
              })}
            </Card>
          </Section>
        ) : null}

        <Section title="Last 6 months" palette={palette}>
          <Card padding={16} radius={16} elevation="sm">
            <LineChart data={monthlyData} height={120} />
          </Card>
        </Section>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 12,
          letterSpacing: 0.4,
          color: palette.inkMuted,
          textTransform: 'uppercase',
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerSpacer: {
      width: 22,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 22,
      color: palette.ink,
      letterSpacing: -0.4,
    },
    pressed: {
      opacity: 0.7,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 16,
      paddingBottom: 60,
    },
    summaryRow: {
      flexDirection: 'row',
      alignItems: 'center',
    },
    summaryItem: {
      flex: 1,
      gap: 4,
    },
    summaryDivider: {
      width: 1,
      height: 36,
      backgroundColor: palette.border,
      marginHorizontal: 8,
    },
    summaryLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 10,
      letterSpacing: 0.6,
      color: palette.inkMuted,
    },
    summaryAmount: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 24,
      color: palette.ink,
      letterSpacing: -0.4,
    },
    bucketRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 10,
      paddingVertical: 10,
      borderBottomWidth: 1,
      borderBottomColor: palette.border,
    },
    swatch: {
      width: 28,
      height: 28,
      borderRadius: 8,
      backgroundColor: palette.surfaceAlt,
    },
    bucketText: {
      flex: 1,
    },
    bucketName: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
    },
    bucketPct: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: palette.inkMuted,
      marginTop: 1,
    },
    bucketAmount: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: palette.ink,
      fontVariant: ['tabular-nums'],
    },
    empty: {
      height: 140,
      alignItems: 'center',
      justifyContent: 'center',
    },
    emptyText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: palette.inkSoft,
    },
  });
}
