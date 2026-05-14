import * as Haptics from 'expo-haptics';
import { useState } from 'react';
import { ActivityIndicator, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconCircle } from '@/components/ui/IconCircle';
import { PIcon } from '@/components/ui/PIcon';
import { categoryColor, categoryIcon } from '@/components/ui/categoryVisuals';
import { formatINR } from '@/lib/domain/currency';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Category, Expense } from '@/lib/types';

type PendingRowProps = {
  expense: Expense;
  category: Category | undefined;
  isLast?: boolean;
  onReview: (expense: Expense) => void;
};

/**
 * A `status: 'pending'` detection from the notification listener.
 *
 *   - Tick:  confirms the row. Opens the review sheet if category is still
 *            'uncategorized' (the parser doesn't infer categories), otherwise
 *            flips status directly with a success haptic.
 *   - Cross: rejects via Alert confirmation. Rejected rows are soft-deleted
 *            and recoverable from search (iter 35).
 *   - Body:  opens the review sheet prefilled for edit-and-confirm.
 */
export function PendingRow({
  expense,
  category,
  isLast = false,
  onReview,
}: PendingRowProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette, isLast);
  const confirmExpense = useStore((s) => s.confirmExpense);
  const rejectExpense = useStore((s) => s.rejectExpense);
  const [busy, setBusy] = useState<'confirm' | 'reject' | null>(null);

  const isUncategorized = expense.categoryId === 'uncategorized';
  const iconColor = category ? categoryColor(category) : palette.inkSoft;
  const iconName = category ? categoryIcon(category) : 'wallet';
  const isIncome = expense.type === 'income';
  const amountColor = isIncome ? palette.positive : palette.ink;
  const sign = isIncome ? '+' : '';

  const handleConfirm = async () => {
    if (busy) return;
    if (isUncategorized) {
      onReview(expense);
      return;
    }
    setBusy('confirm');
    Haptics.notificationAsync(Haptics.NotificationFeedbackType.Success).catch(
      () => {},
    );
    try {
      await confirmExpense(expense.id);
    } finally {
      setBusy(null);
    }
  };

  const handleReject = async () => {
    if (busy) return;
    setBusy('reject');
    Haptics.impactAsync(Haptics.ImpactFeedbackStyle.Light).catch(() => {});
    try {
      await rejectExpense(expense.id);
    } finally {
      setBusy(null);
    }
  };

  return (
    <Pressable
      accessibilityRole="button"
      accessibilityLabel={`Review pending ${formatINR(expense.amount)}${expense.merchant ? ` from ${expense.merchant}` : ''}`}
      onPress={() => onReview(expense)}
      style={({ pressed }) => [styles.row, pressed && styles.pressed]}
    >
      <IconCircle name={iconName} color={iconColor} size={34} />
      <View style={styles.middle}>
        <Text style={styles.merchant} numberOfLines={1}>
          {expense.merchant ?? 'Unknown source'}
        </Text>
        <View style={styles.meta}>
          <Text style={styles.metaText}>
            {isUncategorized ? 'Tap to categorize' : (category?.name ?? 'Other')}
          </Text>
          <Text style={styles.metaDot}>·</Text>
          <Text style={styles.metaText}>{expense.time}</Text>
        </View>
      </View>
      <Text style={[styles.amount, { color: amountColor }]}>
        {sign}
        {formatINR(expense.amount)}
      </Text>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Reject detection"
        onPress={handleReject}
        disabled={busy !== null}
        hitSlop={6}
        style={({ pressed }) => [
          styles.actionButton,
          styles.rejectButton,
          pressed && styles.actionPressed,
        ]}
      >
        {busy === 'reject' ? (
          <ActivityIndicator size="small" color={palette.negative} />
        ) : (
          <PIcon
            name="close"
            size={14}
            color={palette.negative}
            strokeWidth={2.5}
          />
        )}
      </Pressable>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel={
          isUncategorized ? 'Review and confirm' : 'Confirm detection'
        }
        onPress={handleConfirm}
        disabled={busy !== null}
        hitSlop={6}
        style={({ pressed }) => [
          styles.actionButton,
          styles.confirmButton,
          pressed && styles.actionPressed,
        ]}
      >
        {busy === 'confirm' ? (
          <ActivityIndicator size="small" color={palette.positive} />
        ) : (
          <PIcon
            name="check"
            size={14}
            color={palette.positive}
            strokeWidth={2.5}
          />
        )}
      </Pressable>
    </Pressable>
  );
}

function makeStyles(palette: Palette, isLast: boolean) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
      paddingHorizontal: 14,
      paddingVertical: 10,
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
      fontSize: 14,
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
      fontSize: 14,
      fontVariant: ['tabular-nums'],
      marginRight: 4,
    },
    actionButton: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      borderWidth: 1,
    },
    actionPressed: {
      opacity: 0.6,
    },
    confirmButton: {
      backgroundColor: `${palette.positive}1A`,
      borderColor: `${palette.positive}55`,
    },
    rejectButton: {
      backgroundColor: `${palette.negative}1A`,
      borderColor: `${palette.negative}55`,
    },
  });
}
