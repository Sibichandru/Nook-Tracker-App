import { requireNativeModule } from 'expo-modules-core';

type NookNotificationListenerNativeModule = {
  isPermissionGranted: () => boolean;
  openPermissionSettings: () => void;
  openAppDetailsSettings: () => void;
  getInstallerPackageName: () => string;
  getQueuePath: () => string;
  getDebugLogPath: () => string;
  getAllowlistPath: () => string;
};

export default requireNativeModule<NookNotificationListenerNativeModule>(
  'NookNotificationListener',
);
