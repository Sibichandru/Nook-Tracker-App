import { useRef } from 'react';
import { Alert, Pressable, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconCircle } from '@/components/ui/IconCircle';
import { PIcon } from '@/components/ui/PIcon';
import {
  categoryColor,
  categoryIcon,
} from '@/components/ui/categoryVisuals';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

import {
  AddCategorySheet,
  type AddCategorySheetRef,
} from './AddCategorySheet';

export function CategoryManager() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const categories = useStore((s) => s.categories);
  const deleteCategory = useStore((s) => s.deleteCategory);
  const sheetRef = useRef<AddCategorySheetRef>(null);

  const handleDelete = (id: string, name: string) => {
    Alert.alert(
      `Delete "${name}"?`,
      'Expenses already tagged with this category will become uncategorized.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Delete',
          style: 'destructive',
          onPress: () => deleteCategory(id),
        },
      ],
    );
  };

  return (
    <View style={styles.container}>
      {categories.map((c) => (
        <View key={c.id} style={styles.row}>
          <IconCircle
            name={categoryIcon(c)}
            color={categoryColor(c)}
            size={32}
          />
          <Text style={styles.name}>{c.name}</Text>
          {c.custom ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel={`Delete ${c.name}`}
              onPress={() => handleDelete(c.id, c.name)}
              hitSlop={8}
              style={({ pressed }) => [
                styles.deleteBtn,
                pressed && styles.pressed,
              ]}
            >
              <PIcon
                name="close"
                size={16}
                color={palette.inkSoft}
                strokeWidth={2.4}
              />
            </Pressable>
          ) : (
            <Text style={styles.builtIn}>Built-in</Text>
          )}
        </View>
      ))}
      <Button
        label="+ Add category"
        variant="secondary"
        onPress={() => sheetRef.current?.open()}
        fullWidth
      />
      <AddCategorySheet ref={sheetRef} />
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    container: {
      gap: 8,
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      paddingVertical: 8,
      paddingHorizontal: 12,
      borderRadius: 12,
      backgroundColor: palette.surface,
      borderWidth: 1,
      borderColor: palette.border,
    },
    name: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
      flex: 1,
    },
    builtIn: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: palette.inkSoft,
    },
    deleteBtn: {
      width: 28,
      height: 28,
      alignItems: 'center',
      justifyContent: 'center',
      borderRadius: 999,
      backgroundColor: palette.surfaceAlt,
    },
    pressed: {
      opacity: 0.7,
    },
  });
}
