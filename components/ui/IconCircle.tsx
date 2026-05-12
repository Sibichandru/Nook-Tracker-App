import { StyleSheet, View } from 'react-native';

import { PIcon, type PIconName } from './PIcon';

type IconCircleProps = {
  name: PIconName;
  color: string;
  /** Outer circle size in pt (default 34) */
  size?: number;
  /** Inner icon size in pt (default ~ size * 0.53) */
  iconSize?: number;
  /** Hex alpha (00..FF) for the background tint (default '22' ≈ 13%) */
  bgAlpha?: string;
  /** When true, the bg uses the full color with no alpha (for selected states) */
  solid?: boolean;
};

export function IconCircle({
  name,
  color,
  size = 34,
  iconSize,
  bgAlpha = '22',
  solid = false,
}: IconCircleProps) {
  const computedIconSize = iconSize ?? Math.round(size * 0.53);
  const backgroundColor = solid ? color : `${color}${bgAlpha}`;

  return (
    <View
      style={[
        styles.base,
        {
          width: size,
          height: size,
          borderRadius: Math.round(size * 0.3),
          backgroundColor,
        },
      ]}
    >
      <PIcon
        name={name}
        size={computedIconSize}
        color={solid ? '#FFFFFF' : color}
        strokeWidth={2}
      />
    </View>
  );
}

const styles = StyleSheet.create({
  base: {
    alignItems: 'center',
    justifyContent: 'center',
  },
});
