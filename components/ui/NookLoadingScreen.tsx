/**
 * Full-screen branded loader shown while the app boots.
 *
 * Replaces the bare `ActivityIndicator`s that used to sit between the native
 * splash and the first real screen. The native splash (expo-splash-screen)
 * paints the same mark on the same background colour, so the handoff from
 * native to JS is invisible rather than a flash of a different screen.
 *
 * Uses the "coin pulse" loader from the brand design — three coins pulsing in
 * sequence. Chosen over the coin-drop animation because it needs no animated
 * SVG attributes, which keeps it dependable on the New Architecture; the boot
 * window is a few hundred milliseconds, where a subtle cue reads better than an
 * elaborate one anyway.
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withDelay,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';

import { NookLockup } from '@/components/ui/NookMark';
import { useAccent, useTheme } from '@/lib/theme';

const COIN_COUNT = 3;
const PULSE_MS = 1050;
const STAGGER_MS = 160;

function Coin({ index, color }: { index: number; color: string }) {
  const progress = useSharedValue(0);

  useEffect(() => {
    progress.value = withDelay(
      index * STAGGER_MS,
      withRepeat(
        withSequence(
          withTiming(1, {
            duration: PULSE_MS * 0.45,
            easing: Easing.inOut(Easing.ease),
          }),
          withTiming(0, {
            duration: PULSE_MS * 0.55,
            easing: Easing.inOut(Easing.ease),
          }),
        ),
        -1,
        false,
      ),
    );
  }, [index, progress]);

  const style = useAnimatedStyle(() => ({
    opacity: 0.32 + progress.value * 0.68,
    transform: [{ scale: 0.6 + progress.value * 0.4 }],
  }));

  return (
    <Animated.View
      style={[styles.coin, { backgroundColor: color }, style]}
    />
  );
}

export function NookLoadingScreen({ label }: { label?: string }) {
  const { palette } = useTheme();
  const accent = useAccent();

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <NookLockup size={88} />

      <View style={styles.coins}>
        {Array.from({ length: COIN_COUNT }, (_, i) => (
          <Coin key={i} index={i} color={accent.base} />
        ))}
      </View>

      {label ? (
        <Text style={[styles.label, { color: palette.inkMuted }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
    gap: 36,
  },
  coins: { flexDirection: 'row', alignItems: 'center', gap: 9 },
  coin: { width: 12, height: 12, borderRadius: 6 },
  label: {
    fontFamily: 'Inter_400Regular',
    fontSize: 13,
    marginTop: -18,
  },
});
