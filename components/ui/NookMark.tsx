/**
 * The Nook brand mark and wordmark.
 *
 * Geometry is a 100×100 box: an arch (the nook — an alcove) with a slotted coin
 * tucked inside. Kept as vector rather than a bitmap so it stays crisp at every
 * size and can pick up the user's accent colour, which a PNG can't.
 *
 * The launcher and splash PNGs are generated from the same geometry in
 * `assets/brand/*.svg` via `npm run icons`. If you change the shape here, change
 * it there too — they are intentionally duplicated because one is compiled into
 * the app binary and the other renders at runtime.
 */

import Svg, { Circle, Defs, Mask, Path, Rect } from 'react-native-svg';
import { StyleSheet, Text, View } from 'react-native';

import { useAccent, useTheme } from '@/lib/theme';

/** The arch. Shared by every variant. */
const ARCH_PATH = 'M30 78 L30 47 A20 20 0 0 1 70 47 L70 78 Z';
const COIN = { cx: 50, cy: 63, r: 12 };
/** Corner radius as a fraction of the tile, matching the launcher icon. */
const CORNER_RADIUS_RATIO = 0.22;

export type NookMarkVariant =
  /** Accent tile, white arch — the primary lockup. */
  | 'color'
  /** White tile, accent arch — for use on accent-coloured backgrounds. */
  | 'inverse'
  /** Single-colour silhouette on transparency, coin knocked out. */
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

  if (variant === 'mono') {
    const tint = color ?? palette.ink;
    return (
      <Svg width={size} height={size} viewBox="0 0 100 100">
        <Defs>
          {/* White keeps, black knocks out: the coin is removed from the arch,
              then the slot bar is painted back in. */}
          <Mask id="nookMono">
            <Rect width="100" height="100" fill="#fff" />
            <Circle cx={COIN.cx} cy={COIN.cy} r={COIN.r} fill="#000" />
            <Rect x="44" y="61.5" width="12" height="3" rx="1.5" fill="#fff" />
          </Mask>
        </Defs>
        <Path d={ARCH_PATH} fill={tint} mask="url(#nookMono)" />
      </Svg>
    );
  }

  const tile = variant === 'color' ? accent.base : '#FFFFFF';
  const arch = variant === 'color' ? '#FFFFFF' : accent.base;
  const coin = variant === 'color' ? accent.base : '#FFFFFF';

  return (
    <Svg width={size} height={size} viewBox="0 0 100 100">
      <Rect width="100" height="100" rx={CORNER_RADIUS_RATIO * 100} fill={tile} />
      <Path d={ARCH_PATH} fill={arch} />
      <Circle cx={COIN.cx} cy={COIN.cy} r={COIN.r} fill={coin} />
      <Rect x="44" y="61.5" width="12" height="3" rx="1.5" fill={arch} />
    </Svg>
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
}: {
  size?: number;
  tagline?: string | null;
}) {
  const { palette } = useTheme();
  return (
    <View style={styles.lockup}>
      <NookMark size={size} />
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
  lockup: { alignItems: 'center', gap: 20 },
  lockupText: { alignItems: 'center', gap: 6 },
  tagline: {
    fontFamily: 'Inter_500Medium',
    letterSpacing: 1.4,
    textTransform: 'uppercase',
  },
});

export { ARCH_PATH as NOOK_ARCH_PATH, COIN as NOOK_COIN };
