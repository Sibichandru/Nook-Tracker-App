import { router } from 'expo-router';
import { useRef } from 'react';
import { Pressable, ScrollView, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  BudgetEditor,
  type BudgetEditorRef,
} from '@/components/budgets/BudgetEditor';
import { Card } from '@/components/ui/Card';
import { IconCircle } from '@/components/ui/IconCircle';
import { PIcon } from '@/components/ui/PIcon';
import {
  categoryColor,
  categoryIcon,
} from '@/components/ui/categoryVisuals';
import { formatINR } from '@/lib/domain/currency';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

export default function BudgetsScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const editorRef = useRef<BudgetEditorRef>(null);

  const categories = useStore((s) => s.categories);
  const budgets = useStore((s) => s.budgets);

  const overall = budgets.find((b) => b.type === 'overall') ?? null;

  const handleEditOverall = () =>
    editorRef.current?.open({ type: 'overall', categoryId: null }, overall);

  const handleEditCategory = (categoryId: string) => {
    const existing =
      budgets.find(
        (b) => b.type === 'category' && b.categoryId === categoryId,
      ) ?? null;
    editorRef.current?.open({ type: 'category', categoryId }, existing);
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
        <Text style={styles.title}>Budgets</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        <Section title="Overall" palette={palette}>
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Edit overall budget"
            onPress={handleEditOverall}
            style={({ pressed }) => [styles.row, pressed && styles.pressed]}
          >
            <View style={styles.rowMain}>
              <Text style={styles.label}>Monthly cap</Text>
              <Text style={styles.amount}>
                {overall ? formatINR(overall.amount) : 'Tap to set'}
              </Text>
            </View>
            <PIcon
              name="chevron"
              size={18}
              color={palette.inkSoft}
              strokeWidth={2}
            />
          </Pressable>
        </Section>

        <Section title="Per category" palette={palette}>
          {categories.map((c) => {
            const b = budgets.find(
              (bd) => bd.type === 'category' && bd.categoryId === c.id,
            );
            return (
              <Pressable
                key={c.id}
                accessibilityRole="button"
                accessibilityLabel={`Edit ${c.name} budget`}
                onPress={() => handleEditCategory(c.id)}
                style={({ pressed }) => [
                  styles.row,
                  pressed && styles.pressed,
                ]}
              >
                <View style={styles.rowLeft}>
                  <IconCircle
                    name={categoryIcon(c)}
                    color={categoryColor(c)}
                    size={28}
                  />
                  <Text style={styles.label}>{c.name}</Text>
                </View>
                <View style={styles.rowRight}>
                  <Text style={[styles.amount, !b && styles.amountEmpty]}>
                    {b ? formatINR(b.amount) : '—'}
                  </Text>
                  <PIcon
                    name="chevron"
                    size={16}
                    color={palette.inkSoft}
                    strokeWidth={2}
                  />
                </View>
              </Pressable>
            );
          })}
        </Section>
      </ScrollView>

      <BudgetEditor ref={editorRef} />
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 12,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: palette.inkMuted,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <Card padding={4} radius={14} elevation="sm">
        <View>{children}</View>
      </Card>
    </View>
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
      gap: 18,
      paddingBottom: 60,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 12,
      paddingVertical: 12,
      borderRadius: 10,
    },
    rowMain: {
      flex: 1,
      gap: 2,
    },
    rowLeft: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      flex: 1,
    },
    rowRight: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 6,
    },
    label: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
    },
    amount: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: palette.ink,
      fontVariant: ['tabular-nums'],
    },
    amountEmpty: {
      color: palette.inkSoft,
      fontFamily: 'Inter_400Regular',
    },
  });
}
