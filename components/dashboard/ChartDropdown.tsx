import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PIcon } from '@/components/ui/PIcon';
import { type Palette, useTheme } from '@/lib/theme';
import type { ChartKind } from '@/lib/types';

type Option = { value: ChartKind; label: string };

/**
 * Iter 13 ships bar + donut. Iter 14 will add 'line' and 'budget'.
 */
const OPTIONS: Option[] = [
  { value: 'bar', label: 'Daily' },
  { value: 'donut', label: 'By category' },
];

type ChartDropdownProps = {
  value: ChartKind;
  onChange: (v: ChartKind) => void;
};

export function ChartDropdown({ value, onChange }: ChartDropdownProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const [open, setOpen] = useState(false);
  const currentLabel =
    OPTIONS.find((o) => o.value === value)?.label ?? 'Chart';

  return (
    <View style={styles.wrap}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`Chart type: ${currentLabel}. Tap to change.`}
        onPress={() => setOpen((o) => !o)}
        style={({ pressed }) => [styles.trigger, pressed && styles.pressed]}
      >
        <Text style={styles.triggerText}>{currentLabel}</Text>
        <PIcon
          name="chevdown"
          size={14}
          color={palette.inkMuted}
          strokeWidth={2}
        />
      </Pressable>
      {open ? (
        <View style={styles.menu}>
          {OPTIONS.map((o) => {
            const active = o.value === value;
            return (
              <Pressable
                key={o.value}
                accessibilityRole="button"
                accessibilityState={{ selected: active }}
                onPress={() => {
                  onChange(o.value);
                  setOpen(false);
                }}
                style={({ pressed }) => [
                  styles.option,
                  pressed && styles.optionPressed,
                ]}
              >
                <Text
                  style={[
                    styles.optionText,
                    active && styles.optionTextActive,
                  ]}
                >
                  {o.label}
                </Text>
              </Pressable>
            );
          })}
        </View>
      ) : null}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    wrap: {
      position: 'relative',
    },
    trigger: {
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
    pressed: {
      opacity: 0.7,
    },
    triggerText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12.5,
      color: palette.ink,
    },
    menu: {
      position: 'absolute',
      top: '100%',
      right: 0,
      marginTop: 6,
      minWidth: 150,
      backgroundColor: palette.surface,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      padding: 4,
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 8 },
      shadowOpacity: 0.12,
      shadowRadius: 24,
      elevation: 4,
      zIndex: 20,
    },
    option: {
      paddingHorizontal: 10,
      paddingVertical: 8,
      borderRadius: 6,
    },
    optionPressed: {
      backgroundColor: palette.surfaceAlt,
    },
    optionText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: palette.inkMuted,
    },
    optionTextActive: {
      color: palette.ink,
      fontFamily: 'Inter_600SemiBold',
    },
  });
}
