import { Pressable, StyleSheet, Text, View } from 'react-native';

import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Period } from '@/lib/types';

// 'custom' remains a valid Period for filters and the reports range picker,
// but the dashboard period switcher is intentionally limited to the four
// canonical windows.
const PERIODS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
];

export function PeriodBar() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const activePeriod = useStore((s) => s.ui.activePeriod);
  const setActivePeriod = useStore((s) => s.setActivePeriod);

  return (
    <View style={styles.bar}>
      {PERIODS.map((p) => {
        const active = p.value === activePeriod;
        return (
          <Pressable
            key={p.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={p.label}
            onPress={() => setActivePeriod(p.value)}
            style={({ pressed }) => [
              styles.button,
              active && styles.buttonActive,
              pressed && !active && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {p.label}
            </Text>
          </Pressable>
        );
      })}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      backgroundColor: palette.pill,
      borderRadius: 12,
      padding: 4,
      gap: 2,
    },
    button: {
      flex: 1,
      paddingVertical: 7,
      borderRadius: 8,
      alignItems: 'center',
      backgroundColor: 'transparent',
    },
    buttonActive: {
      backgroundColor: palette.surface,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.06,
      shadowRadius: 2,
      elevation: 1,
    },
    pressed: {
      opacity: 0.6,
    },
    label: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: palette.inkMuted,
    },
    labelActive: {
      color: palette.ink,
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
