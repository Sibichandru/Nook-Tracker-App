import { requireNativeModule } from 'expo-modules-core';

type NookNotificationListenerNativeModule = {
  isPermissionGranted: () => boolean;
  openPermissionSettings: () => void;
  openAppDetailsSettings: () => void;
  getInstallerPackageName: () => string;
  getQueuePath: () => string;
  getDebugLogPath: () => string;
  getAllowlistPath: () => string;
  isListenerConnected: () => boolean;
  requestRebind: () => boolean;
  getManufacturer: () => string;
  isIgnoringBatteryOptimizations: () => boolean;
  requestIgnoreBatteryOptimizations: () => boolean;
  openAutostartSettings: () => boolean;
};

export default requireNativeModule<NookNotificationListenerNativeModule>(
  'NookNotificationListener',
);
