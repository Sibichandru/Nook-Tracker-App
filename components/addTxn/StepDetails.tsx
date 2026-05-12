import { BottomSheetTextInput } from '@gorhom/bottom-sheet';
import DateTimePicker, {
  type DateTimePickerEvent,
} from '@react-native-community/datetimepicker';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { Field } from '@/components/ui/Field';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import type { TransactionDraft } from '@/lib/domain/transactionDraft';
import { type Palette, useTheme } from '@/lib/theme';
import type { PaymentMethod } from '@/lib/types';

type StepDetailsProps = {
  draft: TransactionDraft;
  onPatch: (patch: Partial<TransactionDraft>) => void;
  /** Set in edit mode (iter 20); when provided, renders a delete button */
  onDelete?: () => void;
};

const formatDateTime = (date: string, time: string): string => {
  const d = new Date(`${date}T${time}:00`);
  const today = new Date();
  const isSameDay = d.toDateString() === today.toDateString();
  const yesterday = new Date(today);
  yesterday.setDate(today.getDate() - 1);
  const isYesterday = d.toDateString() === yesterday.toDateString();
  const timeStr = d.toLocaleTimeString('en-IN', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
  if (isSameDay) return `Today, ${timeStr}`;
  if (isYesterday) return `Yesterday, ${timeStr}`;
  return `${d.toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}, ${timeStr}`;
};

export function StepDetails({ draft, onPatch, onDelete }: StepDetailsProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const [tagInput, setTagInput] = useState(draft.tags.join(', '));
  const [pickerMode, setPickerMode] = useState<'idle' | 'date' | 'time'>('idle');

  const currentDateTime = new Date(`${draft.date}T${draft.time}:00`);

  const handleDateTimePress = () => setPickerMode('date');

  const handleDateChange = (e: DateTimePickerEvent, d?: Date) => {
    if (e.type === 'set' && d) {
      onPatch({ date: d.toISOString().slice(0, 10) });
      setPickerMode('time');
    } else {
      setPickerMode('idle');
    }
  };

  const handleTimeChange = (e: DateTimePickerEvent, d?: Date) => {
    if (e.type === 'set' && d) {
      const hh = d.getHours().toString().padStart(2, '0');
      const mm = d.getMinutes().toString().padStart(2, '0');
      onPatch({ time: `${hh}:${mm}` });
    }
    setPickerMode('idle');
  };

  const commitTags = () => {
    const tags = tagInput
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);
    onPatch({ tags });
  };

  return (
    <View style={styles.container}>
      <View style={styles.fieldGroup}>
        <Text style={styles.label}>MERCHANT</Text>
        <BottomSheetTextInput
          placeholder="e.g. Swiggy, Uber, Apollo"
          placeholderTextColor={palette.inkSoft}
          value={draft.merchant ?? ''}
          onChangeText={(s) => onPatch({ merchant: s || null })}
          style={styles.input}
        />
      </View>

      <Field
        icon="calendar"
        label="Date & time"
        value={formatDateTime(draft.date, draft.time)}
        onPress={handleDateTimePress}
      />

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>PAYMENT METHOD</Text>
        <SegmentedControl
          options={[
            { value: 'cash', label: 'Cash' },
            { value: 'card', label: 'Card' },
            { value: 'upi', label: 'UPI' },
            { value: 'bank', label: 'Bank' },
          ]}
          value={draft.paymentMethod}
          onChange={(v: PaymentMethod) => onPatch({ paymentMethod: v })}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>TAGS (comma-separated)</Text>
        <BottomSheetTextInput
          placeholder="lunch, work, recurring"
          placeholderTextColor={palette.inkSoft}
          value={tagInput}
          onChangeText={setTagInput}
          onBlur={commitTags}
          style={styles.input}
        />
      </View>

      <View style={styles.fieldGroup}>
        <Text style={styles.label}>NOTE</Text>
        <BottomSheetTextInput
          placeholder="Optional note"
          placeholderTextColor={palette.inkSoft}
          value={draft.note ?? ''}
          onChangeText={(s) => onPatch({ note: s || null })}
          style={[styles.input, styles.multiline]}
          multiline
          numberOfLines={3}
        />
      </View>

      {onDelete ? (
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Delete transaction"
          onPress={onDelete}
          style={({ pressed }) => [
            styles.deleteButton,
            pressed && styles.deletePressed,
          ]}
        >
          <Text style={styles.deleteText}>Delete transaction</Text>
        </Pressable>
      ) : null}

      {pickerMode === 'date' ? (
        <DateTimePicker
          mode="date"
          value={currentDateTime}
          onChange={handleDateChange}
        />
      ) : null}
      {pickerMode === 'time' ? (
        <DateTimePicker
          mode="time"
          value={currentDateTime}
          onChange={handleTimeChange}
        />
      ) : null}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      gap: 12,
    },
    fieldGroup: {
      gap: 4,
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
    multiline: {
      minHeight: 70,
      textAlignVertical: 'top',
    },
    deleteButton: {
      marginTop: 8,
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderColor: palette.negative,
      alignItems: 'center',
    },
    deletePressed: {
      opacity: 0.7,
    },
    deleteText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      color: palette.negative,
    },
  });
}
