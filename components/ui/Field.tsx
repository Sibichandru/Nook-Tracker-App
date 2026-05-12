import { type ReactNode } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PIcon, type PIconName } from '@/components/ui/PIcon';
import { type Palette, useTheme } from '@/lib/theme';

type FieldProps = {
  icon?: PIconName;
  label: string;
  value: string;
  onPress?: () => void;
  right?: ReactNode;
  /** Override the value text color (e.g. inkSoft for placeholder feel) */
  valueColor?: string;
};

export function Field({
  icon,
  label,
  value,
  onPress,
  right,
  valueColor,
}: FieldProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const content = (
    <View style={styles.row}>
      {icon ? (
        <PIcon
          name={icon}
          size={18}
          color={palette.inkMuted}
          strokeWidth={2}
        />
      ) : null}
      <View style={styles.text}>
        <Text style={styles.label}>{label}</Text>
        <Text
          style={[styles.value, valueColor ? { color: valueColor } : null]}
          numberOfLines={1}
        >
          {value}
        </Text>
      </View>
      {right ? <View style={styles.rightSlot}>{right}</View> : null}
    </View>
  );

  if (!onPress) {
    return <View style={styles.container}>{content}</View>;
  }

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${label}: ${value}`}
      onPress={onPress}
      style={({ pressed }) => [
        styles.container,
        pressed && styles.pressed,
      ]}
    >
      {content}
    </Pressable>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingVertical: 12,
      paddingHorizontal: 14,
    },
    pressed: {
      opacity: 0.7,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    text: {
      flex: 1,
    },
    label: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      color: palette.inkMuted,
      textTransform: 'uppercase',
      letterSpacing: 0.4,
    },
    value: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
      marginTop: 2,
    },
    rightSlot: {
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
