import {
  DMSerifDisplay_400Regular,
  useFonts as useSerifFonts,
} from '@expo-google-fonts/dm-serif-display';
import {
  Inter_400Regular,
  Inter_500Medium,
  Inter_600SemiBold,
  Inter_700Bold,
} from '@expo-google-fonts/inter';
import { Stack } from 'expo-router';
import * as SplashScreen from 'expo-splash-screen';
import { type ReactNode, useEffect } from 'react';
import { ActivityIndicator, View } from 'react-native';
import { GestureHandlerRootView } from 'react-native-gesture-handler';
import { SafeAreaProvider } from 'react-native-safe-area-context';

import { AuthProvider } from '@/lib/auth-context';
import { useDrainOnForeground } from '@/lib/notifications/useDrainOnForeground';
import { useStore } from '@/lib/store';
import { ThemeProvider, useTheme } from '@/lib/theme';

SplashScreen.preventAutoHideAsync().catch(() => {
  // best effort — splash will still hide automatically if this throws
});

export default function RootLayout() {
  const [fontsLoaded, fontError] = useSerifFonts({
    Inter_400Regular,
    Inter_500Medium,
    Inter_600SemiBold,
    Inter_700Bold,
    DMSerifDisplay_400Regular,
  });

  useEffect(() => {
    if (fontsLoaded || fontError) {
      SplashScreen.hideAsync().catch(() => {});
    }
  }, [fontsLoaded, fontError]);

  if (!fontsLoaded && !fontError) {
    return null;
  }

  return (
    <GestureHandlerRootView style={{ flex: 1 }}>
      <SafeAreaProvider>
        <ThemeProvider>
          <HydrationGate>
            <AuthProvider>
              <NotificationDrainer />
              <Stack screenOptions={{ headerShown: false }} />
            </AuthProvider>
          </HydrationGate>
        </ThemeProvider>
      </SafeAreaProvider>
    </GestureHandlerRootView>
  );
}

/**
 * Blocks render until the local store has loaded data from SQLite. Lives here
 * (rather than in lib/store) so it can use the theme palette for the splash
 * placeholder.
 */
function HydrationGate({ children }: { children: ReactNode }) {
  const hydrated = useStore((s) => s.hydrated);
  const hydrate = useStore((s) => s.hydrate);
  const { palette } = useTheme();

  useEffect(() => {
    hydrate().catch((e) => {
      // Surface to console for now; iteration 29 (polish) adds an error UI.
      console.error('Store hydration failed:', e);
    });
  }, [hydrate]);

  if (!hydrated) {
    return (
      <View
        style={{
          flex: 1,
          alignItems: 'center',
          justifyContent: 'center',
          backgroundColor: palette.bg,
        }}
      >
        <ActivityIndicator color={palette.ink} />
      </View>
    );
  }
  return <>{children}</>;
}

/**
 * Mount-only effect host for the notification queue drain. Lives inside
 * HydrationGate so the store is guaranteed-ready before we start inserting
 * pending rows.
 */
function NotificationDrainer() {
  useDrainOnForeground();
  return null;
}
