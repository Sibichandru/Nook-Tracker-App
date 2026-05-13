import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import { StyleSheet, Text, useWindowDimensions, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Chip } from '@/components/ui/Chip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Filters, PaymentMethod, Period } from '@/lib/types';

export type FilterSheetRef = {
  open: () => void;
  close: () => void;
};

const PERIOD_OPTIONS: { value: Period; label: string }[] = [
  { value: 'day', label: 'Day' },
  { value: 'week', label: 'Week' },
  { value: 'month', label: 'Month' },
  { value: 'year', label: 'Year' },
  { value: 'custom', label: 'Custom' },
];

const PAYMENT_OPTIONS: { value: PaymentMethod; label: string }[] = [
  { value: 'cash', label: 'Cash' },
  { value: 'card', label: 'Card' },
  { value: 'upi', label: 'UPI' },
  { value: 'bank', label: 'Bank' },
];

const DEFAULT_FILTERS: Filters = {
  period: 'month',
  categoryIds: [],
  paymentMethods: [],
  tags: [],
};

export const FilterSheet = forwardRef<FilterSheetRef>(
  function FilterSheet(_props, ref) {
    const { palette } = useTheme();
    const styles = makeStyles(palette);
    const sheetRef = useRef<BottomSheetModal>(null);
    const { height: windowHeight } = useWindowDimensions();
    const categories = useStore((s) => s.categories);
    const currentFilters = useStore((s) => s.filters);
    const setFilters = useStore((s) => s.setFilters);

    // Local draft so user can tweak before applying
    const [draft, setDraft] = useState<Filters>(currentFilters);
    const [minAmountText, setMinAmountText] = useState(
      currentFilters.minAmount?.toString() ?? '',
    );
    const [maxAmountText, setMaxAmountText] = useState(
      currentFilters.maxAmount?.toString() ?? '',
    );
    const [tagsInput, setTagsInput] = useState(currentFilters.tags.join(', '));

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setDraft(currentFilters);
          setMinAmountText(currentFilters.minAmount?.toString() ?? '');
          setMaxAmountText(currentFilters.maxAmount?.toString() ?? '');
          setTagsInput(currentFilters.tags.join(', '));
          sheetRef.current?.present();
        },
        close: () => sheetRef.current?.dismiss(),
      }),
      [currentFilters],
    );

    const renderBackdrop = useCallback(
      (props: BottomSheetBackdropProps) => (
        <BottomSheetBackdrop
          {...props}
          appearsOnIndex={0}
          disappearsOnIndex={-1}
          opacity={0.45}
        />
      ),
      [],
    );

    const maxSheetHeight = useMemo(
      () => windowHeight * 0.92,
      [windowHeight],
    );

    const toggleCategory = (id: string) => {
      setDraft((d) => ({
        ...d,
        categoryIds: d.categoryIds.includes(id)
          ? d.categoryIds.filter((c) => c !== id)
          : [...d.categoryIds, id],
      }));
    };

    const togglePayment = (method: PaymentMethod) => {
      setDraft((d) => ({
        ...d,
        paymentMethods: d.paymentMethods.includes(method)
          ? d.paymentMethods.filter((p) => p !== method)
          : [...d.paymentMethods, method],
      }));
    };

    const handleApply = () => {
      const parseAmount = (s: string): number | undefined => {
        if (!s.trim()) return undefined;
        const n = parseFloat(s.replace(/[^0-9.]/g, ''));
        return isNaN(n) ? undefined : n;
      };
      const tags = tagsInput
        .split(',')
        .map((t) => t.trim())
        .filter(Boolean);
      setFilters({
        ...draft,
        minAmount: parseAmount(minAmountText),
        maxAmount: parseAmount(maxAmountText),
        tags,
      });
      sheetRef.current?.dismiss();
    };

    const handleReset = () => {
      setDraft(DEFAULT_FILTERS);
      setMinAmountText('');
      setMaxAmountText('');
      setTagsInput('');
    };

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        maxDynamicContentSize={maxSheetHeight}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: palette.surface }}
        handleIndicatorStyle={{ backgroundColor: palette.borderStrong }}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.headerRow}>
            <Text style={styles.title}>Filters</Text>
            <Button
              label="Reset"
              variant="ghost"
              size="sm"
              onPress={handleReset}
              hapticFeedback={false}
            />
          </View>

          <View style={styles.body}>
            <Section title="Period" palette={palette}>
              <SegmentedControl
                options={PERIOD_OPTIONS}
                value={draft.period}
                onChange={(v) => setDraft((d) => ({ ...d, period: v }))}
              />
            </Section>

            <Section title="Categories" palette={palette}>
              <View style={styles.chipRow}>
                {categories.map((c) => (
                  <Chip
                    key={c.id}
                    label={c.name}
                    active={draft.categoryIds.includes(c.id)}
                    onPress={() => toggleCategory(c.id)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Payment methods" palette={palette}>
              <View style={styles.chipRow}>
                {PAYMENT_OPTIONS.map((p) => (
                  <Chip
                    key={p.value}
                    label={p.label}
                    active={draft.paymentMethods.includes(p.value)}
                    onPress={() => togglePayment(p.value)}
                  />
                ))}
              </View>
            </Section>

            <Section title="Amount range" palette={palette}>
              <View style={styles.amountRow}>
                <View style={styles.amountCol}>
                  <Text style={styles.amountLabel}>Min</Text>
                  <BottomSheetTextInput
                    placeholder="₹0"
                    placeholderTextColor={palette.inkSoft}
                    keyboardType="decimal-pad"
                    value={minAmountText}
                    onChangeText={setMinAmountText}
                    style={styles.amountInput}
                  />
                </View>
                <View style={styles.amountCol}>
                  <Text style={styles.amountLabel}>Max</Text>
                  <BottomSheetTextInput
                    placeholder="No limit"
                    placeholderTextColor={palette.inkSoft}
                    keyboardType="decimal-pad"
                    value={maxAmountText}
                    onChangeText={setMaxAmountText}
                    style={styles.amountInput}
                  />
                </View>
              </View>
            </Section>

            <Section title="Tags (comma-separated)" palette={palette}>
              <BottomSheetTextInput
                placeholder="lunch, work, recurring"
                placeholderTextColor={palette.inkSoft}
                value={tagsInput}
                onChangeText={setTagsInput}
                style={styles.tagsInput}
              />
            </Section>
          </View>

          <View style={styles.footer}>
            <Button
              label="Apply filters"
              variant="primary"
              onPress={handleApply}
              fullWidth
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

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
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 12,
          letterSpacing: 0.4,
          color: palette.inkMuted,
          textTransform: 'uppercase',
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 18,
      paddingTop: 6,
      paddingBottom: 18,
      gap: 12,
    },
    headerRow: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 4,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 22,
      color: palette.ink,
      letterSpacing: -0.4,
    },
    body: {
      paddingTop: 8,
      paddingBottom: 4,
      gap: 18,
    },
    chipRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    amountRow: {
      flexDirection: 'row',
      gap: 12,
    },
    amountCol: {
      flex: 1,
      gap: 4,
    },
    amountLabel: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      color: palette.inkMuted,
      paddingHorizontal: 4,
    },
    amountInput: {
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
    },
    tagsInput: {
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 12,
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
    },
    footer: {
      paddingTop: 4,
    },
  });
}
