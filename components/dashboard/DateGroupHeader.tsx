import { StyleSheet, Text, View } from 'react-native';

import { formatINR } from '@/lib/domain/currency';
import { fmtDay } from '@/lib/domain/dates';
import { type Palette, useTheme } from '@/lib/theme';

type DateGroupHeaderProps = {
  date: string;
  dailyTotal: number;
};

export function DateGroupHeader({ date, dailyTotal }: DateGroupHeaderProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  return (
    <View style={styles.row}>
      <Text style={styles.label}>{fmtDay(date)}</Text>
      <Text style={styles.total}>{formatINR(dailyTotal)}</Text>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 14,
      paddingVertical: 8,
    },
    label: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 11,
      letterSpacing: 0.5,
      textTransform: 'uppercase',
      color: palette.inkMuted,
    },
    total: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      color: palette.inkSoft,
    },
  });
}
