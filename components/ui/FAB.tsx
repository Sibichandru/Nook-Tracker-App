import * as Haptics from 'expo-haptics';
import { Pressable, StyleSheet } from 'react-native';

import { useTheme } from '@/lib/theme';

import { PIcon, type PIconName } from './PIcon';

type FABProps = {
  onPress: () => void;
  icon?: PIconName;
  accessibilityLabel?: string;
};

/**
 * Floating Action Button — 56×56, accent-colored, with a heavy accent-tinted
 * shadow. Position is controlled by the parent (typically `position: 'absolute'`
 * with `right` + `bottom` set on the screen container).
 */
export function FAB({
  onPress,
  icon = 'plus',
  accessibilityLabel = 'Add',
}: FABProps) {
  const { accent } = useTheme();

  const handlePress = () => {
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    onPress();
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={accessibilityLabel}
      onPress={handlePress}
      style={({ pressed }) => [
        styles.fab,
        {
          backgroundColor: accent.base,
          shadowColor: accent.base,
        },
        pressed && styles.pressed,
      ]}
      hitSlop={8}
    >
      <PIcon name={icon} size={26} color="#FFFFFF" strokeWidth={2.4} />
    </Pressable>
  );
}

const styles = StyleSheet.create({
  fab: {
    width: 56,
    height: 56,
    borderRadius: 18,
    alignItems: 'center',
    justifyContent: 'center',
    shadowOffset: { width: 0, height: 8 },
    shadowOpacity: 0.4,
    shadowRadius: 16,
    elevation: 6,
  },
  pressed: {
    opacity: 0.85,
    transform: [{ scale: 0.96 }],
  },
});
