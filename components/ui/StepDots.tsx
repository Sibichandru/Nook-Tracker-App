import { useEffect } from 'react';
import { StyleSheet, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { type Palette, useTheme } from '@/lib/theme';

type StepDotsProps = {
  total: number;
  current: number;
};

const ACTIVE_WIDTH = 22;
const INACTIVE_WIDTH = 6;
const DOT_HEIGHT = 6;
const ANIM_DURATION = 200;

export function StepDots({ total, current }: StepDotsProps) {
  const { palette, accent } = useTheme();
  const styles = makeStyles(palette);

  return (
    <View
      style={styles.row}
      accessibilityRole="progressbar"
      accessibilityValue={{ min: 1, max: total, now: current + 1 }}
    >
      {Array.from({ length: total }, (_, i) => (
        <Dot
          key={i}
          active={i === current}
          completed={i < current}
          accentColor={accent.base}
          inactiveColor={palette.border}
        />
      ))}
    </View>
  );
}

type DotProps = {
  active: boolean;
  completed: boolean;
  accentColor: string;
  inactiveColor: string;
};

function Dot({ active, completed, accentColor, inactiveColor }: DotProps) {
  const width = useSharedValue(active ? ACTIVE_WIDTH : INACTIVE_WIDTH);

  useEffect(() => {
    width.value = withTiming(active ? ACTIVE_WIDTH : INACTIVE_WIDTH, {
      duration: ANIM_DURATION,
    });
  }, [active, width]);

  const animStyle = useAnimatedStyle(() => ({
    width: width.value,
  }));

  return (
    <Animated.View
      style={[
        {
          height: DOT_HEIGHT,
          borderRadius: DOT_HEIGHT / 2,
          backgroundColor: active || completed ? accentColor : inactiveColor,
        },
        animStyle,
      ]}
    />
  );
}

function makeStyles(_palette: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      gap: 6,
      alignItems: 'center',
      justifyContent: 'center',
    },
  });
}
