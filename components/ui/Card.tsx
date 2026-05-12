import { type ReactNode } from 'react';
import { StyleSheet, View, type ViewStyle } from 'react-native';

import { useTheme } from '@/lib/theme';

export type CardElevation = 'none' | 'sm' | 'md';

type CardProps = {
  children: ReactNode;
  padding?: number;
  radius?: number;
  elevation?: CardElevation;
  bordered?: boolean;
  style?: ViewStyle;
};

const ELEVATIONS: Record<CardElevation, ViewStyle> = {
  none: {},
  sm: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 1 },
    shadowOpacity: 0.04,
    shadowRadius: 4,
    elevation: 1,
  },
  md: {
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 4 },
    shadowOpacity: 0.08,
    shadowRadius: 12,
    elevation: 3,
  },
};

export function Card({
  children,
  padding = 16,
  radius = 14,
  elevation = 'sm',
  bordered = true,
  style,
}: CardProps) {
  const { palette } = useTheme();
  return (
    <View
      style={[
        styles.base,
        {
          backgroundColor: palette.surface,
          borderRadius: radius,
          padding,
          borderWidth: bordered ? 1 : 0,
          borderColor: palette.border,
        },
        ELEVATIONS[elevation],
        style,
      ]}
    >
      {children}
    </View>
  );
}

const styles = StyleSheet.create({
  base: {},
});
