import { BottomSheetModalProvider } from '@gorhom/bottom-sheet';
import { Stack } from 'expo-router';

export default function AppLayout() {
  return (
    <BottomSheetModalProvider>
      <Stack screenOptions={{ headerShown: false }} />
    </BottomSheetModalProvider>
  );
}
