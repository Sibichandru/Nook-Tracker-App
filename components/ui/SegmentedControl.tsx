import { Pressable, StyleSheet, Text, View } from 'react-native';

import { type Palette, useTheme } from '@/lib/theme';

type Option<T extends string> = { value: T; label: string };

type SegmentedControlProps<T extends string> = {
  options: Option<T>[];
  value: T;
  onChange: (v: T) => void;
  accessibilityLabel?: string;
};

export function SegmentedControl<T extends string>({
  options,
  value,
  onChange,
  accessibilityLabel,
}: SegmentedControlProps<T>) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  return (
    <View style={styles.bar} accessibilityLabel={accessibilityLabel}>
      {options.map((o) => {
        const active = o.value === value;
        return (
          <Pressable
            key={o.value}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={o.label}
            onPress={() => onChange(o.value)}
            style={({ pressed }) => [
              styles.button,
              active && styles.buttonActive,
              pressed && !active && styles.pressed,
            ]}
          >
            <Text style={[styles.label, active && styles.labelActive]}>
              {o.label}
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
