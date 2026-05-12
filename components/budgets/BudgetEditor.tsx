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
import { StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Budget } from '@/lib/types';

export type BudgetTarget =
  | { type: 'overall'; categoryId: null }
  | { type: 'category'; categoryId: string };

export type BudgetEditorRef = {
  open: (target: BudgetTarget, existing: Budget | null) => void;
  close: () => void;
};

const THRESHOLD_OPTIONS = [
  { value: '0.5', label: '50%' },
  { value: '0.7', label: '70%' },
  { value: '0.8', label: '80%' },
  { value: '0.9', label: '90%' },
];

export const BudgetEditor = forwardRef<BudgetEditorRef>(
  function BudgetEditor(_props, ref) {
    const { palette } = useTheme();
    const styles = makeStyles(palette);
    const sheetRef = useRef<BottomSheetModal>(null);
    const addBudget = useStore((s) => s.addBudget);
    const updateBudget = useStore((s) => s.updateBudget);
    const deleteBudget = useStore((s) => s.deleteBudget);
    const categories = useStore((s) => s.categories);

    const [target, setTarget] = useState<BudgetTarget>({
      type: 'overall',
      categoryId: null,
    });
    const [existing, setExisting] = useState<Budget | null>(null);
    const [amountText, setAmountText] = useState('');
    const [threshold, setThreshold] = useState('0.8');

    useImperativeHandle(
      ref,
      () => ({
        open: (t, e) => {
          setTarget(t);
          setExisting(e);
          setAmountText(e?.amount ? String(e.amount) : '');
          setThreshold(e?.warnThreshold ? String(e.warnThreshold) : '0.8');
          sheetRef.current?.present();
        },
        close: () => sheetRef.current?.dismiss(),
      }),
      [],
    );

    const handleSave = async () => {
      const amount = parseFloat(amountText.replace(/[^0-9.]/g, ''));
      if (isNaN(amount) || amount <= 0) return;
      const warnThreshold = parseFloat(threshold);

      if (existing) {
        await updateBudget(existing.id, { amount, warnThreshold });
      } else {
        await addBudget({
          type: target.type,
          categoryId: target.categoryId,
          amount,
          periodType: 'monthly',
          warnThreshold,
        });
      }
      sheetRef.current?.dismiss();
    };

    const handleDelete = async () => {
      if (existing) await deleteBudget(existing.id);
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

    const snapPoints = useMemo(() => ['62%'], []);

    const title =
      target.type === 'overall'
        ? 'Monthly budget'
        : `${categories.find((c) => c.id === target.categoryId)?.name ?? 'Category'} budget`;

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: palette.surface }}
        handleIndicatorStyle={{ backgroundColor: palette.borderStrong }}
        keyboardBehavior="interactive"
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.title}>{title}</Text>

          <View style={styles.field}>
            <Text style={styles.label}>AMOUNT</Text>
            <BottomSheetTextInput
              keyboardType="decimal-pad"
              value={amountText}
              onChangeText={setAmountText}
              placeholder="₹0"
              placeholderTextColor={palette.inkSoft}
              style={styles.input}
              autoFocus
            />
          </View>

          <View style={styles.field}>
            <Text style={styles.label}>WARN AT</Text>
            <SegmentedControl
              options={THRESHOLD_OPTIONS}
              value={threshold}
              onChange={setThreshold}
            />
          </View>

          <View style={styles.footer}>
            {existing ? (
              <Button
                label="Remove budget"
                variant="secondary"
                onPress={handleDelete}
                fullWidth
              />
            ) : null}
            <Button
              label="Save budget"
              variant="primary"
              icon="check"
              onPress={handleSave}
              fullWidth
              disabled={!amountText.trim()}
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
      flex: 1,
      paddingHorizontal: 18,
      paddingTop: 6,
      paddingBottom: 18,
      gap: 18,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 22,
      color: palette.ink,
      letterSpacing: -0.4,
      paddingHorizontal: 4,
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
      paddingVertical: 14,
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 24,
      color: palette.ink,
    },
    footer: {
      gap: 8,
      marginTop: 'auto',
    },
  });
}
