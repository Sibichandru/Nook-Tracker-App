import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { IconCircle } from '@/components/ui/IconCircle';
import {
  categoryColor,
  categoryIcon,
} from '@/components/ui/categoryVisuals';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

type StepCategoryProps = {
  categoryId: string | null;
  error?: string;
  onCategoryChange: (id: string) => void;
};

export function StepCategory({
  categoryId,
  error,
  onCategoryChange,
}: StepCategoryProps) {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const categories = useStore((s) => s.categories);

  const handleNewCategory = () => {
    Alert.alert(
      'Custom categories',
      'Open Settings → Categories to add a new one.',
    );
  };

  return (
    <View style={styles.container}>
      {error ? <Text style={styles.error}>{error}</Text> : null}

      <View style={styles.grid}>
        {categories.map((c) => {
          const selected = c.id === categoryId;
          return (
            <Pressable
              key={c.id}
              accessibilityRole="button"
              accessibilityState={{ selected }}
              accessibilityLabel={c.name}
              onPress={() => onCategoryChange(c.id)}
              style={[
                styles.tile,
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
                size={34}
              />
              <Text style={styles.label} numberOfLines={1}>
                {c.name}
              </Text>
            </Pressable>
          );
        })}
      </View>

      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Add a new category"
        onPress={handleNewCategory}
        style={({ pressed }) => [
          styles.newButton,
          pressed && styles.newButtonPressed,
        ]}
      >
        <Text style={styles.newButtonText}>+ New category</Text>
      </Pressable>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      gap: 14,
      paddingTop: 4,
    },
    grid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      justifyContent: 'space-between',
      gap: 8,
      rowGap: 10,
    },
    tile: {
      width: '23.5%',
      aspectRatio: 1,
      borderRadius: 14,
      paddingHorizontal: 4,
      paddingVertical: 8,
      alignItems: 'center',
      justifyContent: 'center',
      gap: 6,
    },
    label: {
      fontFamily: 'Inter_500Medium',
      fontSize: 11,
      color: palette.ink,
      textAlign: 'center',
    },
    newButton: {
      paddingVertical: 12,
      borderRadius: 12,
      borderWidth: 1,
      borderStyle: 'dashed',
      borderColor: palette.borderStrong,
      alignItems: 'center',
      backgroundColor: 'transparent',
      marginTop: 6,
    },
    newButtonPressed: {
      opacity: 0.7,
    },
    newButtonText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: palette.inkMuted,
    },
    error: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: palette.negative,
      textAlign: 'center',
    },
  });
}
