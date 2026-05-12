import { router } from 'expo-router';
import { useRef } from 'react';
import { Alert, Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AddRecurringSheet,
  type AddRecurringSheetRef,
} from '@/components/recurring/AddRecurringSheet';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { PIcon } from '@/components/ui/PIcon';
import { Toggle } from '@/components/ui/Toggle';
import {
  categoryColor,
  categoryIcon,
} from '@/components/ui/categoryVisuals';
import { formatINR } from '@/lib/domain/currency';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

const FREQUENCY_LABEL: Record<string, string> = {
  daily: 'Every day',
  weekly: 'Every week',
  monthly: 'Every month',
};

export default function RecurringScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const sheetRef = useRef<AddRecurringSheetRef>(null);

  const recurring = useStore((s) => s.recurring);
  const categories = useStore((s) => s.categories);
  const updateRecurring = useStore((s) => s.updateRecurring);
  const deleteRecurring = useStore((s) => s.deleteRecurring);

  const handleToggleActive = (id: string, active: boolean) => {
    void updateRecurring(id, { active });
  };

  const handleDelete = (id: string, label: string) => {
    Alert.alert(
      `Delete "${label}"?`,
      'Already generated expenses will remain.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteRecurring(id),
        },
      ],
    );
  };

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <PIcon name="back" size={22} color={palette.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Recurring</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {recurring.length === 0 ? (
          <View style={styles.empty}>
            <View style={styles.emptyIcon}>
              <PIcon
                name="repeat"
                size={32}
                color={palette.inkSoft}
                strokeWidth={2}
              />
            </View>
            <Text style={styles.emptyTitle}>No recurring expenses yet</Text>
            <Text style={styles.emptyHint}>
              Rent, subscriptions, EMIs — set them once and they’ll log
              themselves.
            </Text>
          </View>
        ) : (
          recurring.map((r) => {
            const cat = categories.find((c) => c.id === r.categoryId);
            return (
              <Card
                key={r.id}
                padding={14}
                radius={14}
                elevation="sm"
                style={styles.card}
              >
                <View style={styles.row}>
                  {cat ? (
                    <IconCircle
                      name={categoryIcon(cat)}
                      color={categoryColor(cat)}
                      size={36}
                    />
                  ) : (
                    <View style={styles.placeholder} />
                  )}
                  <View style={styles.rowText}>
                    <Text style={styles.merchant}>{r.merchant}</Text>
                    <Text style={styles.meta}>
                      {formatINR(r.amount)} ·{' '}
                      {FREQUENCY_LABEL[r.frequency] ?? r.frequency}
                    </Text>
                    {r.lastGenerated ? (
                      <Text style={styles.lastGen}>
                        Last generated {r.lastGenerated}
                      </Text>
                    ) : (
                      <Text style={styles.lastGen}>Not run yet</Text>
                    )}
                  </View>
                  <Toggle
                    value={r.active}
                    onChange={(v) => handleToggleActive(r.id, v)}
                    accessibilityLabel={`${r.active ? 'Disable' : 'Enable'} ${r.merchant}`}
                  />
                </View>
                <View style={styles.rowFooter}>
                  <Pressable
                    accessibilityRole="button"
                    accessibilityLabel="Delete"
                    onPress={() => handleDelete(r.id, r.merchant)}
                    hitSlop={6}
                  >
                    <Text style={styles.deleteLink}>Delete</Text>
                  </Pressable>
                </View>
              </Card>
            );
          })
        )}

        <Button
          label="+ Add recurring expense"
          variant="secondary"
          onPress={() => sheetRef.current?.open()}
          fullWidth
        />
      </ScrollView>

      <AddRecurringSheet ref={sheetRef} />
    </SafeAreaView>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerSpacer: {
      width: 22,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 22,
      color: palette.ink,
      letterSpacing: -0.4,
    },
    pressed: {
      opacity: 0.7,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 12,
      paddingBottom: 60,
    },
    empty: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 40,
    },
    emptyIcon: {
      width: 64,
      height: 64,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceAlt,
      marginBottom: 4,
    },
    emptyTitle: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: palette.ink,
    },
    emptyHint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: palette.inkMuted,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
    card: {
      gap: 10,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    placeholder: {
      width: 36,
      height: 36,
      borderRadius: 10,
      backgroundColor: palette.surfaceAlt,
    },
    rowText: {
      flex: 1,
    },
    merchant: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: palette.ink,
    },
    meta: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: palette.inkMuted,
      marginTop: 2,
    },
    lastGen: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: palette.inkSoft,
      marginTop: 2,
    },
    rowFooter: {
      flexDirection: 'row',
      justifyContent: 'flex-end',
    },
    deleteLink: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: palette.negative,
    },
  });
}
