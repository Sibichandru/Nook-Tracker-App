import { useMemo, useState } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import Animated, {
  useAnimatedStyle,
  useSharedValue,
  withTiming,
} from 'react-native-reanimated';

import { PIcon } from '@/components/ui/PIcon';
import { Card } from '@/components/ui/Card';
import { useStore } from '@/lib/store';
import { useAccent, type Palette, useTheme } from '@/lib/theme';
import type { Category, Expense } from '@/lib/types';

import { PendingRow } from './PendingRow';

type PendingTrayProps = {
  pending: Expense[];
  onReview: (expense: Expense) => void;
};

// Approximate compact row height (padding 10 + 34 icon + padding 10 + 1
// border ≈ 55). Capping at four visible rows keeps the tray from dominating
// the dashboard; anything past four scrolls inside the card.
const VISIBLE_ROW_COUNT = 4;
const APPROX_ROW_HEIGHT = 55;
const MAX_LIST_HEIGHT = VISIBLE_ROW_COUNT * APPROX_ROW_HEIGHT;

/**
 * Tray surfaces auto-detected (`status: 'pending'`) rows above the dashboard
 * timeline. Hero card totals exclude these — they only count once the user
 * confirms them. Hidden entirely when there's nothing to review.
 *
 * The whole card is a single-row accordion: tapping the header collapses or
 * expands the list. When expanded with more than {@link VISIBLE_ROW_COUNT}
 * rows, the list scrolls internally so the rest of the dashboard stays
 * reachable without paging through a wall of detections.
 */
export function PendingTray({ pending, onReview }: PendingTrayProps) {
  const { palette } = useTheme();
  const accent = useAccent();
  const categories = useStore((s) => s.categories);
  const styles = makeStyles(palette, accent.base);
  const [collapsed, setCollapsed] = useState<boolean>(false);

  const categoriesById = useMemo<Map<string, Category>>(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // PIcon's `chevron` glyph points right at 0°. Rotate 90° clockwise when
  // expanded so the chevron points down toward the list below; back to 0°
  // (pointing at the badge) when collapsed.
  const chevronRotation = useSharedValue(90);
  const chevronStyle = useAnimatedStyle(() => ({
    transform: [{ rotate: `${chevronRotation.value}deg` }],
  }));

  if (pending.length === 0) return null;

  const overflowing = pending.length > VISIBLE_ROW_COUNT;

  const toggle = () => {
    const next = !collapsed;
    setCollapsed(next);
    chevronRotation.value = withTiming(next ? 0 : 90, { duration: 180 });
  };

  return (
    <Card style={styles.card} padding={0} radius={16} elevation="sm">
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={`${collapsed ? 'Expand' : 'Collapse'} pending detections`}
        accessibilityState={{ expanded: !collapsed }}
        onPress={toggle}
        style={({ pressed }) => [styles.header, pressed && styles.headerPressed]}
      >
        <Text style={styles.title}>To review</Text>
        <View style={styles.headerRight}>
          <View style={styles.badge}>
            <Text style={styles.badgeText}>{pending.length}</Text>
          </View>
          <Animated.View style={chevronStyle}>
            <PIcon
              name="chevron"
              size={16}
              color={palette.inkMuted}
              strokeWidth={2}
            />
          </Animated.View>
        </View>
      </Pressable>
      {collapsed ? null : (
        <ScrollView
          style={overflowing ? styles.scrollableList : undefined}
          // nestedScrollEnabled is the Android knob that lets this inner
          // ScrollView consume drag gestures instead of bubbling them up to
          // the outer dashboard ScrollView.
          nestedScrollEnabled
          showsVerticalScrollIndicator={overflowing}
          bounces={false}
        >
          {pending.map((expense, i) => (
            <PendingRow
              key={expense.id}
              expense={expense}
              category={categoriesById.get(expense.categoryId)}
              isLast={i === pending.length - 1}
              onReview={onReview}
            />
          ))}
        </ScrollView>
      )}
    </Card>
  );
}

function makeStyles(palette: Palette, accentBase: string) {
  return StyleSheet.create({
    card: {
      overflow: 'hidden',
      borderWidth: 1.5,
      borderColor: `${accentBase}55`,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 10,
    },
    headerPressed: {
      opacity: 0.7,
    },
    headerRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    title: {
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
      letterSpacing: 0.4,
      color: palette.inkMuted,
      textTransform: 'uppercase',
    },
    badge: {
      minWidth: 22,
      height: 22,
      paddingHorizontal: 8,
      borderRadius: 11,
      backgroundColor: accentBase,
      alignItems: 'center',
      justifyContent: 'center',
    },
    badgeText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 11,
      color: '#FFFFFF',
    },
    scrollableList: {
      maxHeight: MAX_LIST_HEIGHT,
    },
  });
}
