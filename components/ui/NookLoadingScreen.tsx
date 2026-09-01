/**
 * Full-screen branded loader shown while the app boots.
 *
 * Replaces the bare `ActivityIndicator`s that used to sit between the native
 * splash and the first real screen. The native splash (expo-splash-screen)
 * paints the same mark on the same background colour, so the handoff from
 * native to JS is invisible rather than a flash of a different screen.
 *
 * Uses the "loading mark" from direction 4c — the N draws itself stroke by
 * stroke and the coin snaps in on completion. The tile takes the user's
 * selected accent, so the loader matches the rest of the app.
 */

import { StyleSheet, Text, View } from 'react-native';

import { NookLockup } from '@/components/ui/NookMark';
import { useTheme } from '@/lib/theme';

export function NookLoadingScreen({ label }: { label?: string }) {
  const { palette } = useTheme();

  return (
    <View style={[styles.root, { backgroundColor: palette.bg }]}>
      <NookLockup size={88} animated />
      {label ? (
        <Text style={[styles.label, { color: palette.inkMuted }]}>{label}</Text>
      ) : null}
    </View>
  );
}

const styles = StyleSheet.create({
  root: { flex: 1, alignItems: 'center', justifyContent: 'center', gap: 28 },
  label: { fontFamily: 'Inter_400Regular', fontSize: 13 },
});
