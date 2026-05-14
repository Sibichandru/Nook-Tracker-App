import { router } from 'expo-router';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  AddTxnSheet,
  type AddTxnSheetRef,
} from '@/components/addTxn/AddTxnSheet';
import { DateGroupHeader } from '@/components/dashboard/DateGroupHeader';
import { TxnRow } from '@/components/dashboard/TxnRow';
import { Card } from '@/components/ui/Card';
import { PIcon, type PIconName } from '@/components/ui/PIcon';
import { ExpensesRepo } from '@/lib/db/repositories';
import { groupByDate } from '@/lib/domain/dates';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Category, Expense } from '@/lib/types';

export default function SearchScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const inputRef = useRef<TextInput>(null);
  const sheetRef = useRef<AddTxnSheetRef>(null);

  const [query, setQuery] = useState('');
  const [results, setResults] = useState<Expense[]>([]);
  const [searching, setSearching] = useState(false);

  const categories = useStore((s) => s.categories);
  const density = useStore((s) => s.settings.density);

  const categoriesById = useMemo<Map<string, Category>>(
    () => new Map(categories.map((c) => [c.id, c])),
    [categories],
  );

  // Autofocus the input shortly after mount (gives the screen time to settle)
  useEffect(() => {
    const timer = setTimeout(() => inputRef.current?.focus(), 200);
    return () => clearTimeout(timer);
  }, []);

  // Debounced search — 200ms after the user stops typing
  useEffect(() => {
    const trimmed = query.trim();
    if (!trimmed) {
      setResults([]);
      setSearching(false);
      return;
    }
    let cancelled = false;
    setSearching(true);
    const timer = setTimeout(async () => {
      try {
        const rows = await ExpensesRepo.search(trimmed);
        // Pending detections are reviewed from the dashboard's pending tray,
        // not surfaced here. Iter 35 adds an opt-in toggle for rejected rows.
        if (!cancelled) {
          setResults(rows.filter((r) => r.status === 'confirmed'));
        }
      } finally {
        if (!cancelled) setSearching(false);
      }
    }, 200);
    return () => {
      cancelled = true;
      clearTimeout(timer);
    };
  }, [query]);

  const groups = useMemo(() => groupByDate(results), [results]);

  const handleTxnPress = (expense: Expense) => {
    sheetRef.current?.openEdit(expense);
  };

  const trimmed = query.trim();
  const isEmpty = !trimmed;
  const noResults = trimmed && !searching && results.length === 0;

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
        <View style={styles.searchBox}>
          <PIcon
            name="search"
            size={16}
            color={palette.inkMuted}
            strokeWidth={2}
          />
          <TextInput
            ref={inputRef}
            placeholder="Search merchants, notes…"
            placeholderTextColor={palette.inkSoft}
            value={query}
            onChangeText={setQuery}
            style={styles.input}
            returnKeyType="search"
            autoCorrect={false}
            autoCapitalize="none"
          />
          {query ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Clear search"
              hitSlop={6}
              onPress={() => setQuery('')}
            >
              <PIcon
                name="close"
                size={16}
                color={palette.inkSoft}
                strokeWidth={2}
              />
            </Pressable>
          ) : null}
        </View>
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
        keyboardDismissMode="on-drag"
      >
        {isEmpty ? (
          <EmptyState
            icon="search"
            title="Search your expenses"
            hint="Type a merchant name or note to find matching transactions."
            palette={palette}
          />
        ) : noResults ? (
          <EmptyState
            icon="close"
            title="No matches"
            hint={`Nothing found for “${trimmed}”.`}
            palette={palette}
          />
        ) : (
          <View style={styles.resultsWrap}>
            <Text style={styles.resultsCount}>
              {searching
                ? 'Searching…'
                : `${results.length} ${results.length === 1 ? 'result' : 'results'}`}
            </Text>
            {Array.from(groups.entries()).map(([date, rows]) => {
              const dailyTotal = rows.reduce(
                (sum, e) => sum + (e.type === 'expense' ? e.amount : 0),
                0,
              );
              return (
                <Card
                  key={date}
                  padding={0}
                  radius={16}
                  elevation="sm"
                  style={styles.groupCard}
                >
                  <DateGroupHeader date={date} dailyTotal={dailyTotal} />
                  {rows.map((expense, i) => (
                    <TxnRow
                      key={expense.id}
                      expense={expense}
                      category={categoriesById.get(expense.categoryId)}
                      density={density}
                      isLast={i === rows.length - 1}
                      onPress={handleTxnPress}
                    />
                  ))}
                </Card>
              );
            })}
            {searching ? (
              <View style={styles.searchingIndicator}>
                <ActivityIndicator color={palette.inkMuted} />
              </View>
            ) : null}
          </View>
        )}
      </ScrollView>

      <AddTxnSheet ref={sheetRef} />
    </SafeAreaView>
  );
}

function EmptyState({
  icon,
  title,
  hint,
  palette,
}: {
  icon: PIconName;
  title: string;
  hint: string;
  palette: Palette;
}) {
  return (
    <View style={emptyStyles(palette).wrap}>
      <View style={emptyStyles(palette).iconCircle}>
        <PIcon name={icon} size={28} color={palette.inkSoft} strokeWidth={2} />
      </View>
      <Text style={emptyStyles(palette).title}>{title}</Text>
      <Text style={emptyStyles(palette).hint}>{hint}</Text>
    </View>
  );
}

const emptyStyles = (palette: Palette) =>
  StyleSheet.create({
    wrap: {
      alignItems: 'center',
      gap: 8,
      paddingVertical: 64,
    },
    iconCircle: {
      width: 64,
      height: 64,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
      backgroundColor: palette.surfaceAlt,
      marginBottom: 4,
    },
    title: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: palette.ink,
    },
    hint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: palette.inkMuted,
      textAlign: 'center',
      paddingHorizontal: 32,
    },
  });

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingHorizontal: 16,
      paddingTop: 12,
      paddingBottom: 10,
    },
    pressed: {
      opacity: 0.7,
    },
    searchBox: {
      flex: 1,
      flexDirection: 'row',
      alignItems: 'center',
      gap: 8,
      paddingHorizontal: 12,
      paddingVertical: 10,
      borderRadius: 14,
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
    },
    input: {
      flex: 1,
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
      padding: 0,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      paddingBottom: 80,
      gap: 14,
    },
    resultsWrap: {
      gap: 12,
    },
    resultsCount: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: palette.inkMuted,
      paddingHorizontal: 4,
    },
    groupCard: {
      overflow: 'hidden',
    },
    searchingIndicator: {
      paddingVertical: 16,
      alignItems: 'center',
    },
  });
}
