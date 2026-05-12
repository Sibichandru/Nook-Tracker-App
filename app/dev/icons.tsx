import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { ALL_PICON_NAMES, PIcon } from '@/components/ui/PIcon';
import { type Palette, useTheme } from '@/lib/theme';

export default function IconsDevScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Text style={styles.title}>PIcon library ({ALL_PICON_NAMES.length})</Text>
      <View style={styles.grid}>
        {ALL_PICON_NAMES.map((name) => (
          <View key={name} style={styles.cell}>
            <View style={styles.iconWrap}>
              <PIcon name={name} size={28} color={palette.ink} />
            </View>
            <Text style={styles.label}>{name}</Text>
          </View>
        ))}
      </View>
    </ScrollView>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    container: {
      padding: 16,
      gap: 16,
    },
    title: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 16,
      color: palette.inkMuted,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    cell: {
      width: '23%',
      aspectRatio: 1,
      borderWidth: 1,
      borderColor: palette.border,
      borderRadius: 12,
      backgroundColor: palette.surface,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
      padding: 8,
    },
    iconWrap: {
      alignItems: 'center',
      justifyContent: 'center',
    },
    label: {
      fontFamily: 'Inter_400Regular',
      fontSize: 10,
      color: palette.inkSoft,
    },
  });
}
