import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconCircle } from '@/components/ui/IconCircle';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import {
  categoryColor,
  categoryIcon,
} from '@/components/ui/categoryVisuals';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Frequency, PaymentMethod } from '@/lib/types';

export type AddRecurringSheetRef = {
  open: () => void;
  close: () => void;
};

const isoToday = (): string => new Date().toISOString().slice(0, 10);

export const AddRecurringSheet = forwardRef<AddRecurringSheetRef>(
  function AddRecurringSheet(_props, ref) {
    const { palette } = useTheme();
    const styles = makeStyles(palette);
    const sheetRef = useRef<BottomSheetModal>(null);
    const { height: windowHeight } = useWindowDimensions();
    const addRecurring = useStore((s) => s.addRecurring);
    const runRecurringEngine = useStore((s) => s.runRecurringEngine);
    const categories = useStore((s) => s.categories);

    const [amountText, setAmountText] = useState('');
    const [merchant, setMerchant] = useState('');
    const [categoryId, setCategoryId] = useState<string | null>(null);
    const [paymentMethod, setPaymentMethod] = useState<PaymentMethod>('upi');
    const [frequency, setFrequency] = useState<Frequency>('monthly');

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setAmountText('');
          setMerchant('');
          setCategoryId(null);
          setPaymentMethod('upi');
          setFrequency('monthly');
          sheetRef.current?.present();
        },
        close: () => sheetRef.current?.dismiss(),
      }),
      [],
    );

    const handleSave = async () => {
      const amount = parseFloat(amountText.replace(/[^0-9.]/g, ''));
      if (isNaN(amount) || amount <= 0) return;
      if (!categoryId || !merchant.trim()) return;

      const today = isoToday();
      await addRecurring({
        amount,
        type: 'expense',
        categoryId,
        merchant: merchant.trim(),
        paymentMethod,
        note: null,
        frequency,
        startDate: today,
        nextOccurrence: today,
        lastGenerated: null,
        active: true,
      });
      // Materialize the first occurrence immediately
      await runRecurringEngine();
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
      sheetRef.current?.dismiss();
    };

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
      () => windowHeight * 0.95,
      [windowHeight],
    );

    const canSave = !!(
      categoryId &&
      merchant.trim() &&
      parseFloat(amountText) > 0
    );

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
          <Text style={styles.title}>New recurring expense</Text>

          <View style={styles.body}>
            <View style={styles.field}>
              <Text style={styles.label}>AMOUNT</Text>
              <BottomSheetTextInput
                keyboardType="decimal-pad"
                value={amountText}
                onChangeText={setAmountText}
                placeholder="₹0"
                placeholderTextColor={palette.inkSoft}
                style={styles.amountInput}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>MERCHANT</Text>
              <BottomSheetTextInput
                value={merchant}
                onChangeText={setMerchant}
                placeholder="e.g. Airtel, Netflix"
                placeholderTextColor={palette.inkSoft}
                style={styles.input}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>CATEGORY</Text>
              <View style={styles.categoryGrid}>
                {categories.map((c) => {
                  const selected = c.id === categoryId;
                  return (
                    <Pressable
                      key={c.id}
                      accessibilityRole="button"
                      accessibilityState={{ selected }}
                      onPress={() => setCategoryId(c.id)}
                      style={[
                        styles.categoryTile,
                        {
                          borderColor: selected ? c.color : palette.border,
                          backgroundColor: selected
                            ? `${c.color}22`
                            : palette.surfaceAlt,
                          borderWidth: selected ? 1.5 : 1,
                        },
                      ]}
                    >
                      <IconCircle
                        name={categoryIcon(c)}
                        color={categoryColor(c)}
                        size={28}
                      />
                      <Text style={styles.categoryName} numberOfLines={1}>
                        {c.name}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>PAYMENT METHOD</Text>
              <SegmentedControl
                options={[
                  { value: 'cash', label: 'Cash' },
                  { value: 'card', label: 'Card' },
                  { value: 'upi', label: 'UPI' },
                  { value: 'bank', label: 'Bank' },
                ]}
                value={paymentMethod}
                onChange={(v: PaymentMethod) => setPaymentMethod(v)}
              />
            </View>

            <View style={styles.field}>
              <Text style={styles.label}>FREQUENCY</Text>
              <SegmentedControl
                options={[
                  { value: 'daily', label: 'Daily' },
                  { value: 'weekly', label: 'Weekly' },
                  { value: 'monthly', label: 'Monthly' },
                ]}
                value={frequency}
                onChange={(v: Frequency) => setFrequency(v)}
              />
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              label="Save recurring"
              variant="primary"
              icon="check"
              onPress={handleSave}
              disabled={!canSave}
              fullWidth
            />
          </View>
        </BottomSheetView>
      </BottomSheetModal>
    );
  },
);

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      paddingHorizontal: 18,
      paddingTop: 6,
      paddingBottom: 18,
      gap: 12,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 22,
      color: palette.ink,
      letterSpacing: -0.4,
      paddingHorizontal: 4,
    },
    body: {
      paddingTop: 4,
      paddingBottom: 4,
      gap: 16,
    },
    field: {
      gap: 6,
    },
    label: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      letterSpacing: 0.5,
      color: palette.inkMuted,
      paddingHorizontal: 4,
    },
    input: {
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
    amountInput: {
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      paddingHorizontal: 14,
      paddingVertical: 14,
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 24,
      color: palette.ink,
    },
    categoryGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      // No `gap` here — space-between handles horizontal distribution.
      // Combining gap + space-between + percent widths makes 4 tiles
      // overflow and wrap to 3 per row, doubling the section height.
      rowGap: 8,
    },
    categoryTile: {
      width: '23%',
      aspectRatio: 1,
      borderRadius: 12,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 4,
      padding: 4,
    },
    categoryName: {
      fontFamily: 'Inter_500Medium',
      fontSize: 10,
      color: palette.ink,
      textAlign: 'center',
    },
    footer: {
      paddingTop: 4,
    },
  });
}
