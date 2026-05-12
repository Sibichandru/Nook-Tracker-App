import { StyleSheet, View } from 'react-native';
import { Rect, Svg } from 'react-native-svg';

import type { DailyTotal } from '@/lib/domain/charts';
import { useTheme } from '@/lib/theme';

type BarChartProps = {
  data: DailyTotal[];
  height?: number;
};

const VIEW_WIDTH = 320;
const PADDING = 4;
const BAR_GAP = 2;
const MIN_BAR_HEIGHT = 2;

export function BarChart({ data, height = 140 }: BarChartProps) {
  const { accent } = useTheme();

  const today = new Date().toISOString().slice(0, 10);
  const max = Math.max(...data.map((d) => d.amount), 1);
  const barCount = data.length;
  const totalGap = (barCount - 1) * BAR_GAP;
  const barWidth = (VIEW_WIDTH - totalGap - PADDING * 2) / barCount;
  const innerHeight = height - PADDING * 2;

  return (
    <View style={[styles.container, { height }]}>
      <Svg
        width="100%"
        height={height}
        viewBox={`0 0 ${VIEW_WIDTH} ${height}`}
        preserveAspectRatio="none"
      >
        {data.map((d, i) => {
          const h = (d.amount / max) * innerHeight;
          const finalH = Math.max(h, MIN_BAR_HEIGHT);
          const x = PADDING + i * (barWidth + BAR_GAP);
          const y = height - PADDING - finalH;
          const isToday = d.date === today;
          return (
            <Rect
              key={d.date}
              x={x}
              y={y}
              width={barWidth}
              height={finalH}
              rx={Math.min(2, barWidth / 2)}
              fill={isToday ? accent.base : accent.soft}
            />
          );
        })}
      </Svg>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    width: '100%',
  },
});
