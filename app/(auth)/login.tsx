import { AntDesign, Ionicons } from '@expo/vector-icons';
import { router } from 'expo-router';
import { StatusBar } from 'expo-status-bar';
import { useState } from 'react';
import {
  ActivityIndicator,
  Pressable,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { ACCENTS, THEME } from '@/constants/theme';
import { signInWithGoogle } from '@/lib/auth';

export default function LoginScreen() {
  const [signingIn, setSigningIn] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleGoogleSignIn = async () => {
    if (signingIn) return;
    setError(null);
    setSigningIn(true);
    try {
      const user = await signInWithGoogle();
      // null = user cancelled the picker — stay on login.
      // On success, onAuthStateChanged fires → AuthLayout sees `user` →
      // redirects to /dashboard automatically. No manual navigation here.
      if (!user) return;
    } catch (e: unknown) {
      const message =
        e instanceof Error ? e.message : 'Sign-in failed. Please try again.';
      setError(message);
    } finally {
      setSigningIn(false);
    }
  };

  const handleSkip = () => router.replace('/dashboard');

  return (
    <SafeAreaView style={styles.safe}>
      <StatusBar style="dark" />

      <View style={styles.topBar}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip"
          hitSlop={16}
          onPress={handleSkip}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.skipLink}>Skip ›</Text>
        </Pressable>
      </View>

      <View style={styles.content}>
        <View style={styles.brandRow}>
          <View style={styles.brandIcon}>
            <Text style={styles.brandGlyph}>₹</Text>
          </View>
          <Text style={styles.brandName}>Nook</Text>
        </View>

        <Text style={styles.headline}>Where did{'\n'}the money go?</Text>

        <Text style={styles.supporting}>
          Track every rupee in seconds.{'\n'}
          Categories, tags, splits — all synced with{'\n'}
          your Google account.
        </Text>

        <View style={styles.chips}>
          <View style={styles.chip}>
            <Ionicons name="sparkles" size={14} color={ACCENTS.plum.base} />
            <Text style={styles.chipText}>Smart insights</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="people" size={14} color={ACCENTS.coral.base} />
            <Text style={styles.chipText}>Split with friends</Text>
          </View>
          <View style={styles.chip}>
            <Ionicons name="refresh" size={14} color={ACCENTS.amber.base} />
            <Text style={styles.chipText}>Recurring detection</Text>
          </View>
        </View>

        <View style={styles.spacer} />

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue with Google"
          disabled={signingIn}
          onPress={handleGoogleSignIn}
          style={({ pressed }) => [
            styles.googleButton,
            (pressed || signingIn) && styles.pressed,
          ]}
        >
          {signingIn ? (
            <ActivityIndicator color={THEME.light.ink} />
          ) : (
            <>
              <AntDesign name="google" size={18} color="#4285F4" />
              <Text style={styles.googleButtonText}>Continue with Google</Text>
            </>
          )}
        </Pressable>

        {error ? <Text style={styles.error}>{error}</Text> : null}

        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Continue as guest"
          hitSlop={12}
          onPress={handleSkip}
          style={({ pressed }) => [
            styles.guestButton,
            pressed && styles.pressed,
          ]}
        >
          <Text style={styles.guestButtonText}>Continue as guest →</Text>
        </Pressable>

        <Text style={styles.footer}>
          By continuing you agree to our{' '}
          <Text style={styles.footerLink}>Terms</Text>
          {' & '}
          <Text style={styles.footerLink}>Privacy Policy</Text>
        </Text>
      </View>
    </SafeAreaView>
  );
}

const styles = StyleSheet.create({
  safe: {
    flex: 1,
    backgroundColor: THEME.light.bg,
  },
  topBar: {
    flexDirection: 'row',
    justifyContent: 'flex-end',
    padding: 24,
  },
  skipLink: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME.light.inkMuted,
  },
  content: {
    flex: 1,
    paddingHorizontal: 24,
    paddingVertical: 24,
  },
  brandRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 10,
    marginBottom: 32,
  },
  brandIcon: {
    width: 36,
    height: 36,
    borderRadius: 10,
    backgroundColor: ACCENTS.plum.base,
    alignItems: 'center',
    justifyContent: 'center',
  },
  brandGlyph: {
    color: '#FFFFFF',
    fontSize: 18,
    fontWeight: '700',
  },
  brandName: {
    fontSize: 20,
    fontWeight: '700',
    color: THEME.light.ink,
  },
  headline: {
    fontSize: 36,
    fontWeight: '800',
    lineHeight: 42,
    letterSpacing: -1,
    color: THEME.light.ink,
    marginBottom: 16,
  },
  supporting: {
    fontSize: 15,
    lineHeight: 22,
    color: THEME.light.inkMuted,
    marginBottom: 20,
  },
  chips: {
    flexDirection: 'row',
    flexWrap: 'wrap',
    gap: 8,
  },
  chip: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    paddingHorizontal: 12,
    paddingVertical: 8,
    borderRadius: 999,
    backgroundColor: THEME.light.chipBg,
  },
  chipText: {
    fontSize: 13,
    fontWeight: '500',
    color: THEME.light.ink,
  },
  spacer: {
    flex: 1,
  },
  googleButton: {
    flexDirection: 'row',
    alignItems: 'center',
    justifyContent: 'center',
    gap: 10,
    paddingVertical: 16,
    borderRadius: 16,
    backgroundColor: THEME.light.surface,
    borderWidth: 1,
    borderColor: THEME.light.border,
    marginBottom: 12,
    shadowColor: '#000',
    shadowOffset: { width: 0, height: 2 },
    shadowOpacity: 0.04,
    shadowRadius: 6,
    elevation: 1,
  },
  googleButtonText: {
    fontSize: 16,
    fontWeight: '600',
    color: THEME.light.ink,
  },
  error: {
    fontSize: 13,
    color: THEME.light.negative,
    textAlign: 'center',
    marginBottom: 8,
  },
  guestButton: {
    alignItems: 'center',
    paddingVertical: 12,
    marginBottom: 8,
  },
  guestButtonText: {
    fontSize: 15,
    fontWeight: '500',
    color: THEME.light.inkMuted,
  },
  footer: {
    textAlign: 'center',
    fontSize: 12,
    color: THEME.light.inkSoft,
  },
  footerLink: {
    textDecorationLine: 'underline',
    color: THEME.light.inkMuted,
  },
  pressed: {
    opacity: 0.7,
  },
});
