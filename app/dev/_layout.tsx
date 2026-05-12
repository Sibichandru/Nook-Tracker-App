import { Redirect, Stack } from 'expo-router';

import { FLAGS } from '@/lib/featureFlags';

export default function DevLayout() {
  if (!FLAGS.enableDevRoutes) {
    return <Redirect href="/" />;
  }
  return <Stack screenOptions={{ headerShown: true }} />;
}
