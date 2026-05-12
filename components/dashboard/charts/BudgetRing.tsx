import { StyleSheet, Text, View } from 'react-native';
import { Circle, G, Svg } from 'react-native-svg';

import { formatINR } from '@/lib/domain/currency';
import { type Palette, useTheme } from '@/lib/theme';

type BudgetRingProps = {
  used: number;
  budget: number;
  height?: number;
};

const SIZE = 110;
const RADIUS = 48;
const STROKE = 12;
const CIRCUMFERENCE = 2 * Math.PI * RADIUS;

export function BudgetRing({ used, budget, height = 140 }: BudgetRingProps) {
  const { palette, accent } = useTheme();
  const styles = makeStyles(palette);

  if (budget <= 0) {
    return (
      <View style={[styles.container, styles.emptyContainer, { height }]}>
        <Text style={styles.emptyText}>No budget set</Text>
        <Text style={styles.emptyHint}>
          Open Budgets in Settings to set one.
        </Text>
      </View>
    );
  }

  const fraction = Math.min(used / budget, 1);
  const percent = Math.round((used / budget) * 100);
  const over = used > budget;
  const dashLength = CIRCUMFERENCE * fraction;
  const ringColor = over ? palette.negative : accent.base;
  const left = budget - used;

  return (
    <View style={[styles.container, { height }]}>
      <View style={styles.ringWrap}>
        <Svg width={SIZE} height={SIZE}>
          <G transform={`rotate(-90 ${SIZE / 2} ${SIZE / 2})`}>
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={palette.surfaceAlt}
              strokeWidth={STROKE}
            />
            <Circle
              cx={SIZE / 2}
              cy={SIZE / 2}
              r={RADIUS}
              fill="none"
              stroke={ringColor}
              strokeWidth={STROKE}
              strokeDasharray={`${dashLength} ${CIRCUMFERENCE - dashLength}`}
              strokeLinecap="round"
            />
          </G>
        </Svg>
        <View style={styles.centerLabel}>
          <Text style={styles.usedLabel}>USED</Text>
          <Text style={[styles.percentage, over && { color: palette.negative }]}>
            {percent}%
          </Text>
        </View>
      </View>

      <View style={styles.info}>
        <InfoRow label="Budget" value={formatINR(budget)} palette={palette} />
        <InfoRow label="Spent" value={formatINR(used)} palette={palette} />
        <InfoRow
          label={over ? 'Over' : 'Left'}
          value={formatINR(Math.abs(left))}
          palette={palette}
          color={over ? palette.negative : palette.positive}
        />
      </View>
    </View>
  );
}

function InfoRow({
  label,
  value,
  palette,
  color,
}: {
  label: string;
  value: string;
  palette: Palette;
  color?: string;
}) {
  return (
    <View style={infoRowStyles.row}>
      <Text style={[infoRowStyles.label, { color: palette.inkMuted }]}>
        {label}
      </Text>
      <Text
        style={[
          infoRowStyles.value,
          { color: color ?? palette.ink },
        ]}
      >
        {value}
      </Text>
    </View>
  );
}

const infoRowStyles = StyleSheet.create({
  row: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'baseline',
    gap: 8,
  },
  label: {
    fontFamily: 'Inter_500Medium',
    fontSize: 12,
  },
  value: {
    fontFamily: 'Inter_600SemiBold',
    fontSize: 13,
    fontVariant: ['tabular-nums'],
  },
});

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 16,
    },
    ringWrap: {
      width: SIZE,
      height: SIZE,
      alignItems: 'center',
      justifyContent: 'center',
    },
    centerLabel: {
      position: 'absolute',
      alignItems: 'center',
    },
    usedLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 9,
      letterSpacing: 0.6,
      color: palette.inkSoft,
    },
    percentage: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 22,
      color: palette.ink,
      letterSpacing: -0.4,
    },
    info: {
      flex: 1,
      gap: 8,
    },
    emptyContainer: {
      alignItems: 'center',
      justifyContent: 'center',
      flexDirection: 'column',
      gap: 4,
    },
    emptyText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: palette.inkMuted,
    },
    emptyHint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: palette.inkSoft,
    },
  });
}
