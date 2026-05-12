import { Pressable, StyleSheet, Text } from 'react-native';

import { type Accent, type Palette, useTheme } from '@/lib/theme';

import { PIcon, type PIconName } from './PIcon';

type ChipProps = {
  label: string;
  icon?: PIconName;
  iconColor?: string;
  active?: boolean;
  onPress?: () => void;
  accessibilityLabel?: string;
};

export function Chip({
  label,
  icon,
  iconColor,
  active = false,
  onPress,
  accessibilityLabel,
}: ChipProps) {
  const { palette, accent } = useTheme();
  const styles = makeStyles(palette, accent, active);

  const content = (
    <>
      {icon ? (
        <PIcon
          name={icon}
          size={14}
          color={iconColor ?? styles.text.color}
          strokeWidth={2}
        />
      ) : null}
      <Text style={styles.text}>{label}</Text>
    </>
  );

  if (!onPress) {
    return <Pressable accessibilityRole="text" style={styles.chip} disabled>
      {content}
    </Pressable>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ selected: active }}
      onPress={onPress}
      style={({ pressed }) => [styles.chip, pressed && styles.pressed]}
    >
      {content}
    </Pressable>
  );
}

function makeStyles(palette: Palette, accent: Accent, active: boolean) {
  return StyleSheet.create({
    chip: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 999,
      backgroundColor: active ? accent.base : palette.chipBg,
      borderWidth: 1,
      borderColor: active ? accent.base : palette.border,
    },
    pressed: {
      opacity: 0.7,
    },
    text: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: active ? '#FFFFFF' : palette.ink,
    },
  });
}
