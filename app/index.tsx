import { Redirect } from 'expo-router';

import { NookLoadingScreen } from '@/components/ui/NookLoadingScreen';
import { useAuth } from '@/lib/auth-context';
import { useStore } from '@/lib/store';

export default function Index() {
  const { user, initializing } = useAuth();
  const hydrated = useStore((s) => s.hydrated);
  const onboarded = useStore((s) => s.settings.onboarded);

  // Wait for both auth and store to finish loading. In practice HydrationGate
  // has already blocked on the store, so `initializing` is the live condition —
  // but both are checked so this stays correct if the gate ever moves.
  if (initializing || !hydrated) {
    return <NookLoadingScreen />;
  }

  // First-run users go through onboarding regardless of auth state.
  if (!onboarded) {
    return <Redirect href={'/onboarding' as never} />;
  }

  return <Redirect href={user ? '/dashboard' : '/login'} />;
}
