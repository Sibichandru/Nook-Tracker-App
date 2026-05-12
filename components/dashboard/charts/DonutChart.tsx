import { StyleSheet, Text, View } from 'react-native';
import { Circle, G, Svg } from 'react-native-svg';

import type { CategoryBucket } from '@/lib/domain/charts';
import { formatINR } from '@/lib/domain/currency';
import { type Palette, useTheme } from '@/lib/theme';

type DonutChartProps = {
  buckets: CategoryBucket[];
  height?: number;
};

const RADIUS = 50;
const STROKE_WIDTH = 14;
const SVG_SIZE = (RADIUS + STROKE_WIDTH / 2) * 2 + 4;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function DonutChart({ buckets, height = 140 }: DonutChartProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const total = buckets.reduce((sum, b) => sum + b.amount, 0);

  // Pre-compute slice metadata so the loop body stays simple.
  const slices: { color: string; length: number; offset: number }[] = [];
  {
    let cumulative = 0;
    for (const b of buckets) {
      const fraction = total > 0 ? b.amount / total : 0;
      const length = CIRCUMFERENCE * fraction;
      slices.push({
        color: b.color,
        length,
        offset: -cumulative,
      });
      cumulative += length;
    }
  }

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.donutWrap}>
        <Svg width={SVG_SIZE} height={SVG_SIZE}>
          <G transform={`rotate(-90 ${SVG_SIZE / 2} ${SVG_SIZE / 2})`}>
            {/* Track */}
            <Circle
              cx={SVG_SIZE / 2}
              cy={SVG_SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={palette.surfaceAlt}
              strokeWidth={STROKE_WIDTH}
            />
            {slices.map((s, i) => (
              <Circle
                key={i}
                cx={SVG_SIZE / 2}
                cy={SVG_SIZE / 2}
                r={RADIUS}
                fill="none"
                stroke={s.color}
                strokeWidth={STROKE_WIDTH}
                strokeDasharray={`${s.length} ${CIRCUMFERENCE - s.length}`}
                strokeDashoffset={s.offset}
                strokeLinecap="butt"
              />
            ))}
          </G>
        </Svg>
        <View style={styles.centerLabel}>
          <Text style={styles.totalLabel}>TOTAL</Text>
          <Text style={styles.totalAmount}>
            {formatINR(total, { compact: true })}
          </Text>
        </View>
      </View>

      <View style={styles.legend}>
        {buckets.map((b) => (
          <View key={b.categoryId} style={styles.legendItem}>
            <View style={[styles.swatch, { backgroundColor: b.color }]} />
            <View style={styles.legendText}>
              <Text style={styles.legendName} numberOfLines={1}>
                {b.name}
              </Text>
              <Text style={styles.legendAmount}>
                {formatINR(b.amount, { compact: true })}
              </Text>
            </View>
          </View>
        ))}
      </View>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    donutWrap: {
      width: SVG_SIZE,
      height: SVG_SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerLabel: {
      position: 'absolute',
      alignItems: 'center',
    },
    totalLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 9,
      letterSpacing: 0.6,
      color: palette.inkSoft,
    },
    totalAmount: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 18,
      color: palette.ink,
      letterSpacing: -0.4,
    },
    legend: {
      flex: 1,
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      rowGap: 10,
    },
    legendItem: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      width: '47%',
    },
    swatch: {
      width: 8,
      height: 8,
      borderRadius: 4,
    },
    legendText: {
      flex: 1,
    },
    legendName: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      color: palette.ink,
    },
    legendAmount: {
      fontFamily: 'Inter_400Regular',
      fontSize: 10,
      color: palette.inkMuted,
      fontVariant: ['tabular-nums'],
    },
  });
}
