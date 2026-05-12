import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useReducer,
  useRef,
} from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { PIcon } from '@/components/ui/PIcon';
import { StepDots } from '@/components/ui/StepDots';
import { validateStep } from '@/lib/domain/transactionDraft';
import { type Palette, useTheme } from '@/lib/theme';
import type { Expense } from '@/lib/types';

import { initialSheetState, sheetReducer } from './sheetState';
import { StepAmount } from './StepAmount';

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
    const [state, dispatch] = useReducer(sheetReducer, initialSheetState);

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

    const handlePrimary = () => {
      const errors = validateStep(state.draft, state.step);
      if (state.mode === 'create' && Object.keys(errors).length > 0) {
        dispatch({ type: 'set-errors', errors });
        return;
      }
      if (state.step < 2) {
        dispatch({ type: 'next' });
      } else {
        // Save handler arrives in iter 19; close for now.
        handleClose();
      }
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

    const snapPoints = useMemo(() => ['62%', '92%'], []);

    return (
      <BottomSheetModal
        ref={sheetRef}
        snapPoints={snapPoints}
        index={0}
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
            ) : (
              <View style={styles.placeholder}>
                <Text style={styles.placeholderText}>
                  Step {state.step + 1} wires up in iter 19
                </Text>
              </View>
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
      flex: 1,
      padding: 18,
      gap: 12,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 0,
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
      flex: 1,
      paddingTop: 8,
    },
    placeholder: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    placeholderText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: palette.inkSoft,
    },
    footer: {
      paddingBottom: 8,
    },
  });
}
