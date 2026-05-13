import {
  BottomSheetBackdrop,
  type BottomSheetBackdropProps,
  BottomSheetModal,
  BottomSheetTextInput,
  BottomSheetView,
} from '@gorhom/bottom-sheet';
import * as Haptics from 'expo-haptics';
import {
  forwardRef,
  useCallback,
  useImperativeHandle,
  useMemo,
  useRef,
  useState,
} from 'react';
import {
  Pressable,
  StyleSheet,
  Text,
  useWindowDimensions,
  View,
} from 'react-native';

import { Button } from '@/components/ui/Button';
import { IconCircle } from '@/components/ui/IconCircle';
import { type PIconName } from '@/components/ui/PIcon';
import { ACCENTS } from '@/constants/theme';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

export type AddCategorySheetRef = {
  open: () => void;
  close: () => void;
};

const COLOR_OPTIONS = [
  ACCENTS.teal.base,
  ACCENTS.indigo.base,
  ACCENTS.coral.base,
  ACCENTS.amber.base,
  ACCENTS.plum.base,
  '#E07A5F',
  '#4E8098',
  '#9B6BCF',
  '#3C9D8E',
  '#D36FA2',
];

// Curated subset of PIcon names suitable for categories
const ICON_OPTIONS: PIconName[] = [
  'food',
  'transport',
  'shopping',
  'home',
  'bills',
  'fun',
  'health',
  'salary',
  'travel',
  'coffee',
  'wallet',
  'card',
  'cash',
  'tag',
  'note',
];

export const AddCategorySheet = forwardRef<AddCategorySheetRef>(
  function AddCategorySheet(_props, ref) {
    const { palette } = useTheme();
    const styles = makeStyles(palette);
    const sheetRef = useRef<BottomSheetModal>(null);
    const { height: windowHeight } = useWindowDimensions();
    const addCategory = useStore((s) => s.addCategory);

    const [name, setName] = useState('');
    const [icon, setIcon] = useState<PIconName>('wallet');
    const [color, setColor] = useState<string>(COLOR_OPTIONS[0]);

    useImperativeHandle(
      ref,
      () => ({
        open: () => {
          setName('');
          setIcon('wallet');
          setColor(COLOR_OPTIONS[0]);
          sheetRef.current?.present();
        },
        close: () => sheetRef.current?.dismiss(),
      }),
      [],
    );

    const handleSave = async () => {
      if (!name.trim()) return;
      await addCategory({
        name: name.trim(),
        icon,
        color,
        custom: true,
      });
      Haptics.notificationAsync(
        Haptics.NotificationFeedbackType.Success,
      ).catch(() => {});
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
      >
        <BottomSheetView style={styles.container}>
          <Text style={styles.title}>New category</Text>

          <View style={styles.body}>
            <View style={styles.preview}>
              <IconCircle name={icon} color={color} size={56} />
              <Text style={styles.previewName}>{name || 'New category'}</Text>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>NAME</Text>
              <BottomSheetTextInput
                placeholder="e.g. Pets, Gifts, Side hustle"
                placeholderTextColor={palette.inkSoft}
                value={name}
                onChangeText={setName}
                style={styles.input}
              />
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>ICON</Text>
              <View style={styles.iconGrid}>
                {ICON_OPTIONS.map((n) => (
                  <Pressable
                    key={n}
                    accessibilityRole="button"
                    accessibilityState={{ selected: n === icon }}
                    accessibilityLabel={`Icon ${n}`}
                    onPress={() => setIcon(n)}
                    style={[
                      styles.iconTile,
                      n === icon && {
                        backgroundColor: `${color}22`,
                        borderColor: color,
                      },
                    ]}
                  >
                    <IconCircle name={n} color={color} size={30} />
                  </Pressable>
                ))}
              </View>
            </View>

            <View style={styles.section}>
              <Text style={styles.label}>COLOR</Text>
              <View style={styles.colorGrid}>
                {COLOR_OPTIONS.map((c) => (
                  <Pressable
                    key={c}
                    accessibilityRole="button"
                    accessibilityState={{ selected: c === color }}
                    accessibilityLabel={`Color ${c}`}
                    onPress={() => setColor(c)}
                    style={[
                      styles.colorSwatch,
                      {
                        backgroundColor: c,
                        borderColor: c === color ? palette.ink : 'transparent',
                      },
                    ]}
                  />
                ))}
              </View>
            </View>
          </View>

          <View style={styles.footer}>
            <Button
              label="Save category"
              variant="primary"
              icon="check"
              onPress={handleSave}
              disabled={!name.trim()}
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
      paddingHorizontal: 18,
      paddingTop: 6,
      paddingBottom: 18,
      gap: 12,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 22,
      color: palette.ink,
      letterSpacing: -0.4,
      paddingHorizontal: 4,
    },
    body: {
      paddingTop: 4,
      paddingBottom: 4,
      gap: 18,
    },
    preview: {
      alignItems: 'center',
      gap: 8,
    },
    previewName: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: palette.ink,
    },
    section: {
      gap: 8,
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
    iconGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 8,
    },
    iconTile: {
      width: 48,
      height: 48,
      borderRadius: 12,
      borderWidth: 1.5,
      borderColor: palette.border,
      alignItems: 'center',
      justifyContent: 'center',
    },
    colorGrid: {
      flexDirection: 'row',
      flexWrap: 'wrap',
      gap: 12,
    },
    colorSwatch: {
      width: 32,
      height: 32,
      borderRadius: 999,
      borderWidth: 2.5,
    },
    footer: {
      paddingTop: 4,
    },
  });
}
