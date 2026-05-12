import { Pressable, StyleSheet, View } from 'react-native';

import { ACCENTS } from '@/constants/theme';
import { type AccentKey, type Palette, useTheme } from '@/lib/theme';

type AccentSwatchRowProps = {
  value: AccentKey;
  onChange: (key: AccentKey) => void;
};

const ACCENT_KEYS: AccentKey[] = ['teal', 'indigo', 'coral', 'amber', 'plum'];

export function AccentSwatchRow({ value, onChange }: AccentSwatchRowProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  return (
    <View style={styles.row}>
      {ACCENT_KEYS.map((key) => {
        const accent = ACCENTS[key];
        const active = key === value;
        return (
          <Pressable
            key={key}
            accessibilityRole="button"
            accessibilityState={{ selected: active }}
            accessibilityLabel={accent.name}
            onPress={() => onChange(key)}
            style={({ pressed }) => [
              styles.swatch,
              {
                backgroundColor: accent.base,
                borderColor: active ? palette.ink : 'transparent',
              },
              pressed && styles.pressed,
            ]}
          />
        );
      })}
    </View>
  );
}

function makeStyles(_palette: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 12,
      alignItems: 'center',
    },
    swatch: {
      width: 32,
      height: 32,
      borderRadius: 999,
      borderWidth: 2.5,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
