import { Redirect } from 'expo-router';
import { ActivityIndicator, StyleSheet, View } from 'react-native';

import { useAuth } from '@/lib/auth-context';
import { useTheme } from '@/lib/theme';

export default function Index() {
  const { user, initializing } = useAuth();
  const { palette } = useTheme();

  if (initializing) {
    return (
      <View style={[styles.splash, { backgroundColor: palette.bg }]}>
        <ActivityIndicator color={palette.ink} />
      </View>
    );
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
