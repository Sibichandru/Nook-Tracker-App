import * as Haptics from 'expo-haptics';
import { ActivityIndicator, Pressable, StyleSheet, Text } from 'react-native';

import { type Accent, type Palette, useTheme } from '@/lib/theme';

import { PIcon, type PIconName } from './PIcon';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost';
export type ButtonSize = 'sm' | 'md' | 'lg';

type ButtonProps = {
  label: string;
  variant?: ButtonVariant;
  size?: ButtonSize;
  onPress?: () => void;
  disabled?: boolean;
  loading?: boolean;
  icon?: PIconName;
  iconColor?: string;
  hapticFeedback?: boolean;
  fullWidth?: boolean;
  accessibilityLabel?: string;
};

export function Button({
  label,
  variant = 'primary',
  size = 'md',
  onPress,
  disabled,
  loading,
  icon,
  iconColor,
  hapticFeedback = true,
  fullWidth = false,
  accessibilityLabel,
}: ButtonProps) {
  const { palette, accent } = useTheme();
  const styles = makeStyles(palette, accent, variant, size, fullWidth);

  const handlePress = () => {
    if (disabled || loading) return;
    if (hapticFeedback) {
      Haptics.selectionAsync().catch(() => {});
    }
    onPress?.();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel ?? label}
      accessibilityState={{ disabled: disabled || loading }}
      disabled={disabled || loading}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.button,
        pressed && !disabled && !loading && styles.pressed,
        disabled && styles.disabled,
      ]}
    >
      {loading ? (
        <ActivityIndicator color={styles.label.color} />
      ) : (
        <>
          {icon ? (
            <PIcon
              name={icon}
              size={size === 'sm' ? 14 : size === 'md' ? 16 : 18}
              color={iconColor ?? styles.label.color}
            />
          ) : null}
          <Text style={styles.label}>{label}</Text>
        </>
      )}
    </Pressable>
  );
}

function makeStyles(
  palette: Palette,
  accent: Accent,
  variant: ButtonVariant,
  size: ButtonSize,
  fullWidth: boolean,
) {
  const paddingV = size === 'sm' ? 8 : size === 'md' ? 12 : 16;
  const paddingH = size === 'sm' ? 12 : size === 'md' ? 16 : 20;
  const fontSize = size === 'sm' ? 13 : size === 'md' ? 15 : 16;

  const bg =
    variant === 'primary'
      ? accent.base
      : variant === 'secondary'
      ? palette.surface
      : 'transparent';
  const textColor =
    variant === 'primary'
      ? '#FFFFFF'
      : variant === 'secondary'
      ? palette.ink
      : palette.inkMuted;
  const borderColor = variant === 'secondary' ? palette.border : 'transparent';

  return StyleSheet.create({
    button: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 8,
      paddingVertical: paddingV,
      paddingHorizontal: paddingH,
      borderRadius: 14,
      backgroundColor: bg,
      borderWidth: variant === 'secondary' ? 1 : 0,
      borderColor,
      alignSelf: fullWidth ? 'stretch' : 'flex-start',
    },
    pressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.4,
    },
    label: {
      fontFamily: 'Inter_600SemiBold',
      fontSize,
      color: textColor,
    },
  });
}
