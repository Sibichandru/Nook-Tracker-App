import { useEffect } from 'react';
import { Pressable, StyleSheet } from 'react-native';
import Animated, {
  interpolate,
  interpolateColor,
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { type Palette, useTheme } from '@/lib/theme';

const TRACK_WIDTH = 40;
const TRACK_HEIGHT = 24;
const THUMB_SIZE = 20;
const THUMB_INSET = 2;
const THUMB_OFFSET_OFF = THUMB_INSET;
const THUMB_OFFSET_ON = TRACK_WIDTH - THUMB_SIZE - THUMB_INSET;

type ToggleProps = {
  value: boolean;
  onChange: (v: boolean) => void;
  /** Defaults to accent.base */
  accentColor?: string;
  accessibilityLabel?: string;
};

export function Toggle({
  value,
  onChange,
  accentColor,
  accessibilityLabel,
}: ToggleProps) {
  const { palette, accent } = useTheme();
  const styles = makeStyles(palette);
  const onColor = accentColor ?? accent.base;
  const offColor = palette.borderStrong;

  const progress = useSharedValue(value ? 1 : 0);

  useEffect(() => {
    progress.value = withTiming(value ? 1 : 0, { duration: 160 });
  }, [value, progress]);

  const trackStyle = useAnimatedStyle(() => ({
    backgroundColor: interpolateColor(
      progress.value,
      [0, 1],
      [offColor, onColor],
    ),
  }));

  const thumbStyle = useAnimatedStyle(() => ({
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0, 1],
          [THUMB_OFFSET_OFF, THUMB_OFFSET_ON],
        ),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="switch"
      accessibilityState={{ checked: value }}
      accessibilityLabel={accessibilityLabel}
      onPress={() => onChange(!value)}
      hitSlop={8}
    >
      <Animated.View style={[styles.track, trackStyle]}>
        <Animated.View style={[styles.thumb, thumbStyle]} />
      </Animated.View>
    </Pressable>
  );
}

function makeStyles(_palette: Palette) {
  return StyleSheet.create({
    track: {
      width: TRACK_WIDTH,
      height: TRACK_HEIGHT,
      borderRadius: TRACK_HEIGHT / 2,
      justifyContent: 'center',
    },
    thumb: {
      width: THUMB_SIZE,
      height: THUMB_SIZE,
      borderRadius: THUMB_SIZE / 2,
      backgroundColor: '#FFFFFF',
      shadowColor: '#000',
      shadowOffset: { width: 0, height: 1 },
      shadowOpacity: 0.2,
      shadowRadius: 2,
      elevation: 2,
    },
  });
}
