import { StyleSheet, Text, View } from 'react-native';

import { type Palette, useTheme } from '@/lib/theme';

/**
 * Stand-in for the four real charts (Bar / Donut / Line / BudgetRing) which
 * land in iterations 13–14. Same 140px height so the hero card's layout is
 * stable across iterations.
 */
export function ChartPlaceholder() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  return (
    <View style={styles.box}>
      <Text style={styles.text}>Chart — wired in iter 13</Text>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    box: {
      height: 140,
      borderRadius: 12,
      backgroundColor: palette.surfaceAlt,
      borderWidth: 1,
      borderColor: palette.border,
      borderStyle: 'dashed',
      alignItems: 'center',
      justifyContent: 'center',
    },
    text: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: palette.inkSoft,
    },
  });
}
