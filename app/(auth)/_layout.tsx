import { Redirect, Stack } from 'expo-router';

import { useAuth } from '@/lib/auth-context';

export default function AuthLayout() {
  const { user, initializing } = useAuth();

  // Auth-state still loading — render nothing rather than flashing the login
  // screen for a frame.
  if (initializing) return null;

  // Already signed in → bounce out of the auth flow.
  if (user) return <Redirect href="/dashboard" />;

  return <Stack screenOptions={{ headerShown: false }} />;
}
