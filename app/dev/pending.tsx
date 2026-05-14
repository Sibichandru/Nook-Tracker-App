import { useState } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text } from 'react-native';

import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

/**
 * Dev-only: seed a handful of mock `status: 'pending'` rows so iter 32's
 * Pending Tray can be verified visually before iter 33/34 wire the real
 * notification capture. The seeded rows mimic what the parser would produce
 * from PhonePe, HDFC, and an unknown-merchant ICICI debit.
 *
 * Replace via Settings → reset, or via the "Clear pending" button below.
 */
export default function PendingDevScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const expenses = useStore((s) => s.expenses);
  const categories = useStore((s) => s.categories);
  const addExpense = useStore((s) => s.addExpense);
  const deleteExpense = useStore((s) => s.deleteExpense);
  const [busy, setBusy] = useState(false);

  const pendingCount = expenses.filter((e) => e.status === 'pending').length;

  const foodCategory = categories.find(
    (c) => c.name.toLowerCase() === 'food',
  );

  const seedMockPending = async () => {
    setBusy(true);
    try {
      const today = new Date();
      const isoDate = today.toISOString().slice(0, 10);
      const hh = String(today.getHours()).padStart(2, '0');
      const mm = String(today.getMinutes()).padStart(2, '0');

      // 1. High-confidence Food expense with a real category (still pending)
      await addExpense({
        amount: 450,
        type: 'expense',
        categoryId: foodCategory?.id ?? 'uncategorized',
        merchant: 'SWIGGY',
        paymentMethod: 'upi',
        note: null,
        tags: [],
        date: isoDate,
        time: `${hh}:${mm}`,
        source: 'notification',
        status: 'pending',
        recurringId: null,
      });

      // 2. Medium-confidence — no merchant, uncategorized
      await addExpense({
        amount: 199,
        type: 'expense',
        categoryId: 'uncategorized',
        merchant: null,
        paymentMethod: 'bank',
        note: null,
        tags: [],
        date: isoDate,
        time: `${hh}:${mm}`,
        source: 'notification',
        status: 'pending',
        recurringId: null,
      });

      // 3. Income refund
      await addExpense({
        amount: 350,
        type: 'income',
        categoryId: 'uncategorized',
        merchant: 'Amazon',
        paymentMethod: 'upi',
        note: null,
        tags: [],
        date: isoDate,
        time: `${hh}:${mm}`,
        source: 'notification',
        status: 'pending',
        recurringId: null,
      });
    } finally {
      setBusy(false);
    }
  };

  const clearPending = async () => {
    Alert.alert(
      'Clear pending rows?',
      'Deletes all pending detections from the DB.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: async () => {
            setBusy(true);
            try {
              const pending = useStore
                .getState()
                .expenses.filter((e) => e.status === 'pending');
              for (const p of pending) {
                await deleteExpense(p.id);
              }
            } finally {
              setBusy(false);
            }
          },
        },
      ],
    );
  };

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>Pending tray sandbox</Text>
      <Text style={styles.hint}>
        Seeds three mock notification detections into the DB so the dashboard
        Pending Tray can be verified before the native listener is wired up.
      </Text>
      <Text style={styles.statLine}>
        Pending rows in store: <Text style={styles.statValue}>{pendingCount}</Text>
      </Text>

      <Pressable
        onPress={seedMockPending}
        disabled={busy}
        style={({ pressed }) => [
          styles.button,
          styles.primary,
          pressed && styles.pressed,
          busy && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.primaryText}>Seed 3 mock pending rows</Text>
      </Pressable>

      <Pressable
        onPress={clearPending}
        disabled={busy || pendingCount === 0}
        style={({ pressed }) => [
          styles.button,
          styles.secondary,
          pressed && styles.pressed,
          (busy || pendingCount === 0) && styles.disabled,
        ]}
        accessibilityRole="button"
      >
        <Text style={styles.secondaryText}>Clear all pending</Text>
      </Pressable>
    </ScrollView>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    container: {
      padding: 20,
      gap: 14,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 24,
      color: palette.ink,
    },
    hint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: palette.inkMuted,
      lineHeight: 18,
    },
    statLine: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
      marginTop: 6,
    },
    statValue: {
      fontFamily: 'Inter_700Bold',
    },
    button: {
      paddingVertical: 14,
      borderRadius: 12,
      alignItems: 'center',
      borderWidth: 1,
    },
    primary: {
      backgroundColor: palette.ink,
      borderColor: palette.ink,
    },
    primaryText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: palette.bg,
    },
    secondary: {
      backgroundColor: 'transparent',
      borderColor: palette.negative,
    },
    secondaryText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: palette.negative,
    },
    pressed: {
      opacity: 0.7,
    },
    disabled: {
      opacity: 0.4,
    },
  });
}
