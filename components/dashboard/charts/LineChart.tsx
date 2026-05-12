import { StyleSheet, View } from 'react-native';
import {
  Circle,
  Defs,
  LinearGradient,
  Path,
  Stop,
  Svg,
} from 'react-native-svg';

import type { DailyTotal } from '@/lib/domain/charts';
import { useTheme } from '@/lib/theme';

type LineChartProps = {
  data: DailyTotal[];
  /** Per-day budget overlay; null skips the dashed line */
  budgetPerDay?: number | null;
  height?: number;
};

const VW = 320;
const PADDING = 10;

export function LineChart({
  data,
  budgetPerDay = null,
  height = 140,
}: LineChartProps) {
  const { accent, palette } = useTheme();
  const VH = height;
  const innerH = VH - PADDING * 2;
  const innerW = VW - PADDING * 2;
  const max = Math.max(...data.map((d) => d.amount), budgetPerDay ?? 0, 1);

  const points = data.map((d, i) => {
    const x = PADDING + (i / Math.max(data.length - 1, 1)) * innerW;
    const y = VH - PADDING - (d.amount / max) * innerH;
    return { x, y };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? 'M' : 'L'} ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
    .join(' ');

  const areaPath =
    points.length > 0
      ? `M ${points[0].x.toFixed(1)} ${(VH - PADDING).toFixed(1)} ` +
        points
          .map((p) => `L ${p.x.toFixed(1)} ${p.y.toFixed(1)}`)
          .join(' ') +
        ` L ${points[points.length - 1].x.toFixed(1)} ${(VH - PADDING).toFixed(1)} Z`
      : '';

  const budgetY =
    budgetPerDay !== null && budgetPerDay > 0
      ? VH - PADDING - (budgetPerDay / max) * innerH
      : null;

  const lastPoint = points[points.length - 1];

  return (
    <View style={[styles.container, { height }]}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VW} ${VH}`}
        preserveAspectRatio="none"
      >
        <Defs>
          <LinearGradient id="lineFill" x1="0" y1="0" x2="0" y2="1">
            <Stop offset="0" stopColor={accent.base} stopOpacity={0.3} />
            <Stop offset="1" stopColor={accent.base} stopOpacity={0} />
          </LinearGradient>
        </Defs>
        {areaPath ? <Path d={areaPath} fill="url(#lineFill)" /> : null}
        <Path
          d={linePath}
          stroke={accent.base}
          strokeWidth={2}
          fill="none"
          strokeLinecap="round"
          strokeLinejoin="round"
        />
        {budgetY !== null ? (
          <Path
            d={`M ${PADDING} ${budgetY.toFixed(1)} L ${VW - PADDING} ${budgetY.toFixed(1)}`}
            stroke={palette.inkSoft}
            strokeWidth={1}
            strokeDasharray="4 4"
            fill="none"
          />
        ) : null}
        {lastPoint ? (
          <Circle
            cx={lastPoint.x}
            cy={lastPoint.y}
            r={4}
            fill={accent.base}
            stroke="#FFFFFF"
            strokeWidth={2}
          />
        ) : null}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
