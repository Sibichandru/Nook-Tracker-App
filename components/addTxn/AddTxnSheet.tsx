import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import {
  Alert,
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { PIcon } from '@/components/ui/PIcon';
import { StepDots } from '@/components/ui/StepDots';
import {
  validateForSave,
  validateStep,
} from '@/lib/domain/transactionDraft';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';
import type { Expense } from '@/lib/types';

import { StepAmount } from './StepAmount';
import { StepCategory } from './StepCategory';
import { StepDetails } from './StepDetails';
import { initialSheetState, sheetReducer, type SheetStep } from './sheetState';

export type AddTxnSheetRef = {
  openCreate: () => void;
  openEdit: (expense: Expense) => void;
  close: () => void;
};

const STEP_TITLES = ['Amount', 'Category', 'Details'];

export const AddTxnSheet = forwardRef<AddTxnSheetRef>(
  function AddTxnSheet(_props, ref) {
    const { palette } = useTheme();
    const styles = makeStyles(palette);
    const sheetRef = useRef<BottomSheetModal>(null);
    const { height: windowHeight } = useWindowDimensions();
    const [state, dispatch] = useReducer(sheetReducer, initialSheetState);
    const addExpense = useStore((s) => s.addExpense);
    const updateExpense = useStore((s) => s.updateExpense);
    const deleteExpense = useStore((s) => s.deleteExpense);

    useImperativeHandle(
      ref,
      () => ({
        openCreate: () => {
          dispatch({ type: 'open-create' });
          sheetRef.current?.present();
        },
        openEdit: (expense) => {
          dispatch({ type: 'open-edit', expense });
          sheetRef.current?.present();
        },
        close: () => sheetRef.current?.dismiss(),
      }),
      [],
    );

    const handleClose = useCallback(() => sheetRef.current?.dismiss(), []);

    const handleSave = async () => {
      const errors = validateForSave(state.draft);
      if (Object.keys(errors).length > 0) {
        dispatch({ type: 'set-errors', errors });
        // Send user back to the step that has the first error
        const target: SheetStep = errors.amount ? 0 : errors.categoryId ? 1 : 2;
        dispatch({ type: 'go-to', step: target });
        return;
      }
      // categoryId is guaranteed non-null after validateForSave passed
      if (!state.draft.categoryId) return;

      const payload = {
        amount: state.draft.amount,
        type: state.draft.type,
        categoryId: state.draft.categoryId,
        merchant: state.draft.merchant,
        paymentMethod: state.draft.paymentMethod,
        note: state.draft.note,
        tags: state.draft.tags,
        date: state.draft.date,
        time: state.draft.time,
        source: 'manual' as const,
        recurringId: null,
      };

      try {
        if (state.mode === 'edit' && state.initial) {
          await updateExpense(state.initial.id, payload);
        } else {
          await addExpense(payload);
        }
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Success,
        ).catch(() => {});
        handleClose();
      } catch (e) {
        Haptics.notificationAsync(
          Haptics.NotificationFeedbackType.Error,
        ).catch(() => {});
        Alert.alert(
          'Could not save',
          e instanceof Error ? e.message : 'Unknown error',
        );
      }
    };

    const handleDelete = () => {
      if (state.mode !== 'edit' || !state.initial) return;
      Alert.alert(
        'Delete this transaction?',
        'This cannot be undone.',
        [
          { text: 'Cancel', style: 'cancel' },
          {
            text: 'Delete',
            style: 'destructive',
            onPress: async () => {
              if (state.initial) {
                await deleteExpense(state.initial.id);
              }
              handleClose();
            },
          },
        ],
      );
    };

    const handlePrimary = () => {
      if (state.step < 2) {
        const errors = validateStep(state.draft, state.step);
        if (state.mode === 'create' && Object.keys(errors).length > 0) {
          dispatch({ type: 'set-errors', errors });
          return;
        }
        dispatch({ type: 'next' });
        return;
      }
      void handleSave();
    };

    const handleBack = () => {
      if (state.step > 0) {
        dispatch({ type: 'prev' });
      } else {
        handleClose();
      }
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

    // Sheet hugs its content via gorhom's dynamic sizing. Content height
    // changes per step (small for Amount, larger for Details). maxDynamicContentSize
    // caps very tall content (e.g. Details with keyboard open) so the sheet
    // doesn't push past the screen — BottomSheetScrollView handles overflow.
    const maxSheetHeight = useMemo(() => windowHeight * 0.92, [windowHeight]);

    return (
      <BottomSheetModal
        ref={sheetRef}
        enableDynamicSizing
        maxDynamicContentSize={maxSheetHeight}
        backdropComponent={renderBackdrop}
        backgroundStyle={{ backgroundColor: palette.surface }}
        handleIndicatorStyle={{ backgroundColor: palette.borderStrong }}
        keyboardBehavior="interactive"
        keyboardBlurBehavior="restore"
      >
        <BottomSheetView style={styles.container}>
          <View style={styles.header}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={state.step > 0 ? 'Back' : 'Close'}
              onPress={handleBack}
              style={styles.iconButton}
              hitSlop={8}
            >
              <PIcon
                name={state.step > 0 ? 'back' : 'close'}
                size={20}
                color={palette.ink}
                strokeWidth={2}
              />
            </Pressable>
            <Text style={styles.title}>{STEP_TITLES[state.step]}</Text>
            <Text style={styles.counter}>{state.step + 1}/3</Text>
          </View>

          <View style={styles.dotsWrap}>
            <StepDots total={3} current={state.step} />
          </View>

          <View style={styles.body}>
            {state.step === 0 ? (
              <StepAmount
                amount={state.draft.amount}
                type={state.draft.type}
                error={state.errors.amount}
                onAmountChange={(n) =>
                  dispatch({ type: 'patch', patch: { amount: n } })
                }
                onTypeChange={(t) =>
                  dispatch({ type: 'patch', patch: { type: t } })
                }
              />
            ) : state.step === 1 ? (
              <StepCategory
                categoryId={state.draft.categoryId}
                error={state.errors.categoryId}
                onCategoryChange={(id) =>
                  dispatch({ type: 'patch', patch: { categoryId: id } })
                }
              />
            ) : (
              <StepDetails
                draft={state.draft}
                onPatch={(patch) => dispatch({ type: 'patch', patch })}
                onDelete={state.mode === 'edit' ? handleDelete : undefined}
              />
            )}
          </View>

          <View style={styles.footer}>
            <Button
              label={state.step < 2 ? 'Continue' : 'Save transaction'}
              variant="primary"
              icon={state.step < 2 ? 'chevron' : 'check'}
              onPress={handlePrimary}
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
      // No flex:1 — let height be driven by content so dynamic sizing
      // measures it correctly. With flex:1 the View would expand to fill
      // any parent, breaking the content-hugs-sheet behavior.
      paddingHorizontal: 18,
      paddingTop: 6,
      paddingBottom: 18,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
    },
    iconButton: {
      width: 36,
      height: 36,
      alignItems: 'center',
      justifyContent: 'center',
    },
    title: {
      fontFamily: 'Inter_700Bold',
      fontSize: 14,
      color: palette.ink,
    },
    counter: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: palette.inkMuted,
      width: 36,
      textAlign: 'right',
    },
    dotsWrap: {
      alignItems: 'center',
      paddingVertical: 4,
    },
    body: {
      paddingTop: 8,
      paddingBottom: 8,
    },
    footer: {
      paddingTop: 4,
    },
  });
}
