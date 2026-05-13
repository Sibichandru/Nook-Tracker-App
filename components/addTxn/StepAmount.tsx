import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import { useRef } from 'react';
import { Pressable, StyleSheet, Text, type TextInput, View } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { formatINR } from '@/lib/domain/currency';
import { type Palette, useTheme } from '@/lib/theme';
import type { TxnType } from '@/lib/types';

const QUICK_AMOUNTS = [50, 100, 500, 1000];

type StepAmountProps = {
  amount: number;
  type: TxnType;
  error?: string;
  onAmountChange: (n: number) => void;
  onTypeChange: (t: TxnType) => void;
};

export function StepAmount({
  amount,
  type,
  error,
  onAmountChange,
  onTypeChange,
}: StepAmountProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const inputRef = useRef<TextInput>(null);

  const isIncome = type === 'income';
  const amountColor = isIncome ? palette.positive : palette.ink;
  const whole = Math.floor(amount);
  const wholeStr = whole.toLocaleString('en-IN');
  const decimalCents = Math.round((amount - whole) * 100);
  const decimalStr = `.${decimalCents.toString().padStart(2, '0')}`;

  const focusInput = () => inputRef.current?.focus();

  return (
    <View style={styles.container}>
      <View style={styles.toggleWrap}>
        <SegmentedControl
          options={[
            { value: 'expense', label: 'Expense' },
            { value: 'income', label: 'Income' },
          ]}
          value={type}
          onChange={onTypeChange}
        />
      </View>

      <Pressable onPress={focusInput} style={styles.amountDisplay}>
        <Text style={styles.amountLabel}>AMOUNT</Text>
        <View style={styles.amountRow}>
          <Text style={[styles.amountText, { color: amountColor }]}>
            ₹{wholeStr}
          </Text>
          <Text style={[styles.amountDecimals, { color: palette.inkSoft }]}>
            {decimalStr}
          </Text>
        </View>
        {error ? <Text style={styles.error}>{error}</Text> : null}
        <Text style={styles.tapHint}>
          {amount === 0 ? 'Tap to enter amount' : 'Tap to edit'}
        </Text>
      </Pressable>

      <BottomSheetTextInput
        // @ts-expect-error -- gorhom's BottomSheetTextInput forwards the ref
        // but doesn't propagate the TextInput type in its public API.
        ref={inputRef}
        keyboardType="decimal-pad"
        value={amount === 0 ? '' : String(amount)}
        onChangeText={(s) => {
          const cleaned = s.replace(/[^0-9.]/g, '');
          const n = parseFloat(cleaned);
          onAmountChange(isNaN(n) ? 0 : n);
        }}
        style={styles.hiddenInput}
        accessibilityLabel="Amount"
      />

      <View style={styles.quickRow}>
        {QUICK_AMOUNTS.map((q) => (
          <Chip
            key={q}
            label={`+${formatINR(q)}`}
            onPress={() => onAmountChange(amount + q)}
          />
        ))}
      </View>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      gap: 24,
      paddingTop: 8,
    },
    toggleWrap: {
      maxWidth: 260,
      alignSelf: 'center',
      width: '100%',
    },
    amountDisplay: {
      alignItems: 'center',
      gap: 6,
    },
    amountLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      letterSpacing: 0.6,
      color: palette.inkMuted,
    },
    amountRow: {
      flexDirection: 'row',
      alignItems: 'baseline',
    },
    amountText: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 52,
      letterSpacing: -1.2,
      fontVariant: ['tabular-nums'],
    },
    amountDecimals: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 28,
      fontVariant: ['tabular-nums'],
    },
    tapHint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: palette.inkSoft,
    },
    error: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: palette.negative,
    },
    hiddenInput: {
      position: 'absolute',
      width: 0,
      height: 0,
      opacity: 0,
    },
    quickRow: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
      justifyContent: 'center',
    },
  });
}
