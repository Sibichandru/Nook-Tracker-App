import { StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PIcon } from '@/components/ui/PIcon';
import { formatINR } from '@/lib/domain/currency';
import { type Palette, useTheme } from '@/lib/theme';

import { ChartPlaceholder } from './ChartPlaceholder';

type HeroCardProps = {
  label: string;
  total: number;
  /** Percentage change vs previous period, or null if previous period had no data */
  trendPct: number | null;
};

export function HeroCard({ label, total, trendPct }: HeroCardProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

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
        <View style={styles.dropdownStub}>
          <Text style={styles.dropdownText}>Bar</Text>
          <PIcon
            name="chevdown"
            size={14}
            color={palette.inkMuted}
            strokeWidth={2}
          />
        </View>
      </View>
      <ChartPlaceholder />
    </Card>
  );
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
    dropdownStub: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
      paddingHorizontal: 10,
      paddingVertical: 6,
      borderRadius: 999,
      backgroundColor: palette.chipBg,
      borderWidth: 1,
      borderColor: palette.border,
    },
    dropdownText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12.5,
      color: palette.ink,
    },
  });
}
