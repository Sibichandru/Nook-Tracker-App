import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

export default function Index() {
  const { user, initializing } = useAuth();
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.settings.onboarded);
  const { palette } = useTheme();

  // Wait for both auth and store to finish loading.
  if (initializing || !hydrated) {
    return (
      <View style={[styles.splash, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  }

  // First-run users go through onboarding regardless of auth state.
  if (!onboarded) {
    return <Redirect href={'/onboarding' as never} />;
  }

  return <Redirect href={user ? '/dashboard' : '/login'} />;
}

const styles = StyleSheet.create({
  splash: {
    flex: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
});
