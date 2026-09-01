/**
 * The Nook brand mark and wordmark.
 *
 * Direction 4a — a geometric letterform N: two round-capped stems and a −38°
 * diagonal, with an amber coin resting at the foot of the right stem. Kept as
 * vector rather than a bitmap so it stays crisp at every size and can pick up
 * the user's accent colour, which a PNG can't.
 *
 * The strokes are baked as flat line coordinates rather than a rotated rect,
 * because the icon rasteriser (ImageMagick) silently drops SVG `transform`.
 * The same numbers appear in `assets/brand/*.svg`, which `npm run icons`
 * renders into the launcher/splash PNGs. If you change the shape here, change
 * it there too — they are intentionally duplicated because one is compiled into
 * the app binary and the other renders at runtime.
 */

import { useEffect } from 'react';
import { StyleSheet, Text, View } from 'react-native';
import Animated, {
  Easing,
  useAnimatedStyle,
  useSharedValue,
  withRepeat,
  withSequence,
  withTiming,
} from 'react-native-reanimated';
import Svg, { Circle, G, Line, Rect } from 'react-native-svg';

import { useAccent, useTheme } from '@/lib/theme';

/** Stroke centre-lines in the 100×100 box. Round caps supply the stem shape. */
const STROKE_WIDTH = 10.5;
const STROKES = [
  { x1: 32.25, y1: 32.25, x2: 32.25, y2: 67.75 }, // left stem
  { x1: 67.75, y1: 32.25, x2: 67.75, y2: 67.75 }, // right stem
  { x1: 25.6, y1: 34.83, x2: 49.3, y2: 65.17 }, // diagonal, −38°
];
const COIN = { cx: 69.5, cy: 74.5, r: 6.5 };

/** Warm paper the strokes are cut from, and the amber that means "money". */
export const NOOK_PAPER = '#F7F3EA';
export const NOOK_COIN = '#E2A046';
/** Corner radius as a fraction of the tile, matching the launcher icon. */
const CORNER_RADIUS_RATIO = 0.24;

export type NookMarkVariant =
  /** Accent tile, paper letterform — the primary lockup. */
  | 'color'
  /** Paper tile, accent letterform — for use on accent-coloured backgrounds. */
  | 'inverse'
  /** Single-colour letterform on transparency, no coin (variant 4e "tinted"). */
  | 'mono';

type NookMarkProps = {
  size?: number;
  variant?: NookMarkVariant;
  /** Only used by `mono`; defaults to the current ink colour. */
  color?: string;
};

export function NookMark({
  size = 64,
  variant = 'color',
  color,
}: NookMarkProps) {
  const { palette } = useTheme();
  const accent = useAccent();

  const strokes = (tint: string) => (
    <G stroke={tint} strokeWidth={STROKE_WIDTH} strokeLinecap="round">
      {STROKES.map((s, i) => (
        <Line key={i} {...s} />
      ))}
    </G>
  );

  if (variant === 'mono') {
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        {strokes(color ?? palette.ink)}
      </Svg>
    );
  }

  const tile = variant === 'color' ? accent.base : NOOK_PAPER;
  const glyph = variant === 'color' ? NOOK_PAPER : accent.base;

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect width="100" height="100" rx={CORNER_RADIUS_RATIO * 100} fill={tile} />
      {strokes(glyph)}
      <Circle cx={COIN.cx} cy={COIN.cy} r={COIN.r} fill={NOOK_COIN} />
    </Svg>
  );
}

/* ---------------------------------------------------------------------- *
 * Animated mark — direction 4c, "the N writes itself, coin lands".
 *
 * Built from plain Views rather than the SVG above because animating SVG
 * attributes is unreliable on the New Architecture; a stem is just a rounded
 * rectangle, so a scaleY on a View is the same picture for none of the risk.
 * ---------------------------------------------------------------------- */

const WRITE_MS = 1800;
const EASE = Easing.bezier(0.5, 0, 0.3, 1);
const POP = Easing.bezier(0.3, 1.4, 0.4, 1);

/** Grow from a nub to full length, hold, then start over. */
function useDraw(startPct: number, endPct: number) {
  const grown = useSharedValue(0.04);
  useEffect(() => {
    grown.value = withRepeat(
      withSequence(
        withTiming(0.04, { duration: startPct * WRITE_MS }),
        withTiming(1, { duration: (endPct - startPct) * WRITE_MS, easing: EASE }),
        withTiming(1, { duration: (1 - endPct) * WRITE_MS }),
      ),
      -1,
      false,
    );
  }, [grown, startPct, endPct]);
  return grown;
}

export function NookMarkAnimated({ size = 88 }: { size?: number }) {
  const accent = useAccent();
  const u = (fraction: number) => size * fraction;

  const left = useDraw(0.08, 0.42);
  const diagonal = useDraw(0.22, 0.58);
  const right = useDraw(0.08 + 0.28 / 1.8, 0.42 + 0.28 / 1.8);
  const coin = useSharedValue(0);

  useEffect(() => {
    coin.value = withRepeat(
      withSequence(
        withTiming(0, { duration: 0.58 * WRITE_MS }),
        withTiming(1.18, { duration: 0.16 * WRITE_MS, easing: POP }),
        withTiming(1, { duration: 0.12 * WRITE_MS, easing: POP }),
        withTiming(1, { duration: 0.14 * WRITE_MS }),
      ),
      -1,
      false,
    );
  }, [coin]);

  const stemStyle = { width: u(0.105), height: u(0.46), borderRadius: u(0.042) };
  const leftStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: left.value }],
  }));
  const rightStyle = useAnimatedStyle(() => ({
    transform: [{ scaleY: right.value }],
  }));
  const diagonalStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: '-38deg' }, { scaleY: diagonal.value }],
  }));
  const coinStyle = useAnimatedStyle(() => ({
    opacity: coin.value > 0 ? 1 : 0,
    transform: [{ scale: coin.value }],
  }));

  return (
    <View
      style={{
        width: size,
        height: size,
        borderRadius: u(CORNER_RADIUS_RATIO),
        backgroundColor: accent.base,
        overflow: 'hidden',
      }}
    >
      <Animated.View
        style={[
          styles.stroke,
          stemStyle,
          { left: u(0.27), top: u(0.27), transformOrigin: 'center bottom' },
          leftStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.stroke,
          stemStyle,
          { left: u(0.625), top: u(0.27), transformOrigin: 'center bottom' },
          rightStyle,
        ]}
      />
      <Animated.View
        style={[
          styles.stroke,
          {
            width: u(0.105),
            height: u(0.49),
            borderRadius: u(0.042),
            left: u(0.322),
            top: u(0.255),
            transformOrigin: 'center top',
          },
          diagonalStyle,
        ]}
      />
      <Animated.View
        style={[
          {
            position: 'absolute',
            left: u(0.63),
            top: u(0.68),
            width: u(0.13),
            height: u(0.13),
            borderRadius: u(0.065),
            backgroundColor: NOOK_COIN,
          },
          coinStyle,
        ]}
      />
    </View>
  );
}

/**
 * "Nook" set in DM Serif Display. Rendered as live text rather than baked into
 * the SVG on purpose — the icon generator has no access to the font, so any
 * wordmark exported through that pipeline comes out as mangled glyphs.
 */
export function NookWordmark({
  size = 40,
  color,
}: {
  size?: number;
  color?: string;
}) {
  const { palette } = useTheme();
  return (
    <Text
      style={{
        fontFamily: 'DMSerifDisplay_400Regular',
        fontSize: size,
        lineHeight: size * 1.1,
        // The serif reads loose at display sizes; the design tightens it.
        letterSpacing: size * -0.022,
        color: color ?? palette.ink,
      }}
    >
      Nook
    </Text>
  );
}

/** Mark above wordmark above tagline — the splash and onboarding lockup. */
export function NookLockup({
  size = 88,
  tagline = 'Every rupee, tucked in',
  animated = false,
}: {
  size?: number;
  tagline?: string | null;
  /** Draw the mark on with the 4c write-on loop instead of showing it flat. */
  animated?: boolean;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.lockup}>
      {animated ? <NookMarkAnimated size={size} /> : <NookMark size={size} />}
      <View style={styles.lockupText}>
        <NookWordmark size={size * 0.5} />
        {tagline ? (
          <Text
            style={[
              styles.tagline,
              { color: palette.inkMuted, fontSize: Math.max(11, size * 0.13) },
            ]}
          >
            {tagline}
          </Text>
        ) : null}
      </View>
    </View>
  );
}

const styles = StyleSheet.create({
  stroke: { position: 'absolute', backgroundColor: NOOK_PAPER },
  lockup: { alignItems: 'center', gap: 20 },
  lockupText: { alignItems: 'center', gap: 6 },
  tagline: {
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});
