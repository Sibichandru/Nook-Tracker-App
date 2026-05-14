import ReanimatedSwipeable, {
  type SwipeableMethods,
} from 'react-native-gesture-handler/ReanimatedSwipeable';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

import { IconCircle } from '@/components/ui/IconCircle';
import { PIcon, type PIconName } from '@/components/ui/PIcon';
import { categoryColor, categoryIcon } from '@/components/ui/categoryVisuals';
import { formatINR } from '@/lib/domain/currency';
import { type Palette, useTheme } from '@/lib/theme';
import type { Category, Density, Expense, PaymentMethod } from '@/lib/types';

const PAYMENT_ICON: Record<PaymentMethod, PIconName> = {
  cash: 'cash',
  card: 'card',
  upi: 'upi',
  bank: 'card',
};

/** Width of the revealed delete action panel. */
const DELETE_ACTION_WIDTH = 84;

type TxnRowProps = {
  expense: Expense;
  category: Category | undefined;
  density: Density;
  isLast?: boolean;
  onPress?: (expense: Expense) => void;
  /**
   * If provided, swipe-left reveals a delete affordance whose tap calls this
   * handler. Parent is responsible for confirmation + the actual delete.
   */
  onDelete?: (expense: Expense) => void;
};

export function TxnRow({
  expense,
  category,
  density,
  isLast = false,
  onPress,
  onDelete,
}: TxnRowProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette, density, isLast);

  const iconColor = category ? categoryColor(category) : palette.inkSoft;
  const iconName: PIconName = category ? categoryIcon(category) : 'wallet';
  const isIncome = expense.type === 'income';
  const amountColor = isIncome ? palette.positive : palette.ink;
  const sign = isIncome ? '+' : '';

  const renderRightActions = (
    progress: SharedValue<number>,
    _translation: SharedValue<number>,
    methods: SwipeableMethods,
  ) => (
    <DeleteAction
      progress={progress}
      styles={styles}
      onPress={() => {
        methods.close();
        onDelete?.(expense);
      }}
    />
  );

  const row = (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`${category?.name ?? 'Uncategorized'}, ${formatINR(expense.amount)}, ${expense.merchant ?? ''}`}
      onPress={() => onPress?.(expense)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconCircle
        name={iconName}
        color={iconColor}
        size={density === 'compact' ? 34 : 40}
      />
      <View style={styles.middle}>
        <Text style={styles.merchant} numberOfLines={1} ellipsizeMode="tail">
          {expense.merchant ?? category?.name ?? 'Expense'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>{category?.name ?? 'Other'}</Text>
          <Text style={styles.metaDot}>·</Text>
          <PIcon
            name={PAYMENT_ICON[expense.paymentMethod]}
            size={11}
            color={palette.inkSoft}
            strokeWidth={2}
          />
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{expense.time}</Text>
        </View>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {sign}
        {formatINR(expense.amount)}
      </Text>
    </Pressable>
  );

  if (!onDelete) return row;

  return (
    <ReanimatedSwipeable
      renderRightActions={renderRightActions}
      rightThreshold={DELETE_ACTION_WIDTH / 2}
      overshootRight={false}
      friction={2}
      containerStyle={styles.swipeContainer}
    >
      {row}
    </ReanimatedSwipeable>
  );
}

/**
 * Inner component for the right-swipe action panel. Split out so we can use
 * Reanimated hooks — they can't run inside the `renderRightActions` callback
 * (which is invoked outside React's component context).
 *
 * Reveal choreography: the red strip fills the swept area immediately, but
 * the icon + "Delete" label fade in only once the user has swept far enough
 * that the label fits without overlapping the row's amount. Avoids the
 * jarring moment where the label peeks out from behind the still-translating
 * row content.
 */
function DeleteAction({
  progress,
  styles,
  onPress,
}: {
  progress: SharedValue<number>;
  styles: ReturnType<typeof makeStyles>;
  onPress: () => void;
}) {
  const contentStyle = useAnimatedStyle(() => ({
    opacity: interpolate(
      progress.value,
      [0.55, 0.95],
      [0, 1],
      Extrapolation.CLAMP,
    ),
    transform: [
      {
        translateX: interpolate(
          progress.value,
          [0.55, 0.95],
          [12, 0],
          Extrapolation.CLAMP,
        ),
      },
    ],
  }));

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel="Delete transaction"
      onPress={onPress}
      style={({ pressed }) => [
        styles.deleteAction,
        pressed && styles.deleteActionPressed,
      ]}
    >
      <Animated.View style={[styles.deleteContent, contentStyle]}>
        <PIcon name="close" size={18} color="#FFFFFF" strokeWidth={2.5} />
        <Text style={styles.deleteActionLabel}>Delete</Text>
      </Animated.View>
    </Pressable>
  );
}

function makeStyles(palette: Palette, density: Density, isLast: boolean) {
  const compact = density === 'compact';
  return StyleSheet.create({
    row: {
      // Solid background is critical when wrapped in ReanimatedSwipeable —
      // the right action panel sits behind the row and bleeds through any
      // transparent pixel. Without this, the red strip appears under the
      // amount text the instant swipe begins, instead of growing with the
      // gesture as the row translates over it.
      backgroundColor: palette.surface,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 14,
      paddingVertical: compact ? 10 : 14,
      borderBottomWidth: isLast ? 0 : 1,
      borderBottomColor: palette.border,
    },
    pressed: {
      backgroundColor: palette.surfaceAlt,
    },
    middle: {
      flex: 1,
      gap: 2,
    },
    merchant: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: compact ? 14 : 15,
      color: palette.ink,
    },
    meta: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    metaText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11.5,
      color: palette.inkMuted,
    },
    metaDot: {
      fontSize: 11,
      color: palette.inkSoft,
    },
    amount: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: compact ? 14 : 15,
      fontVariant: ['tabular-nums'],
    },
    swipeContainer: {
      // No border here — the inner row carries it. Adding one would
      // double-stack the divider when the row sits at rest.
      backgroundColor: palette.surface,
    },
    deleteAction: {
      width: DELETE_ACTION_WIDTH,
      backgroundColor: palette.negative,
      alignItems: 'center',
      justifyContent: 'center',
      // overflow:hidden contains the inner content while it animates in,
      // so any pre-fade frame can't leak out beyond the visible strip.
      overflow: 'hidden',
    },
    deleteContent: {
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
    },
    deleteActionPressed: {
      opacity: 0.85,
    },
    deleteActionLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      color: '#FFFFFF',
    },
  });
}
