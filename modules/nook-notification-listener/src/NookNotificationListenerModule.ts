import { requireNativeModule } from 'expo-modules-core';

type NookNotificationListenerNativeModule = {
  isPermissionGranted: () => boolean;
  openPermissionSettings: () => void;
  getQueuePath: () => string;
};

export default requireNativeModule<NookNotificationListenerNativeModule>(
  'NookNotificationListener',
);
