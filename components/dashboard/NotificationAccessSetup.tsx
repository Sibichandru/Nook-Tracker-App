/**
 * Setup card prompting the user to grant Notification Access. Lives on the
 * dashboard above the pending tray.
 *
 * Why this exists: on Android 13+, sideloaded apps hit "Restricted settings"
 * — Notification Access can't be toggled on until the user first opens App
 * Info → ⋮ menu → "Allow restricted settings". We can't toggle it for them
 * (Android forbids it by design), but we can deep-link to the right screens
 * and tell them what to tap.
 *
 * Lifecycle:
 *   - Renders only when the user has opted in to notification capture (the
 *     `notificationCaptureEnabled` setting toggle) AND permission isn't yet
 *     granted AND the user hasn't dismissed.
 *   - On every AppState 'active', re-checks `isPermissionGranted()` so the
 *     card disappears the moment the user grants access in Settings without
 *     them needing to tap anything in Nook.
 *   - Dismissal persists across launches (AsyncStorage). If the user later
 *     revokes the permission, the card will _not_ reappear automatically.
 *     Toggling the Settings switch off and back on clears the dismissal so
 *     the banner returns.
 *
 * Step 1 (restricted settings) is hidden when `getInstallerPackageName()`
 * indicates a Play Store install — the restriction doesn't apply there.
 */

import AsyncStorage from '@react-native-async-storage/async-storage';
import { useCallback, useEffect, useState } from 'react';
import { AppState, type AppStateStatus, Pressable, StyleSheet, Text, View } from 'react-native';

import { Card } from '@/components/ui/Card';
import { PIcon } from '@/components/ui/PIcon';
import {
  getInstallerPackageName,
  getManufacturer,
  isIgnoringBatteryOptimizations,
  isPermissionGranted,
  openAppDetailsSettings,
  openAutostartSettings,
  openPermissionSettings,
  requestIgnoreBatteryOptimizations,
} from 'nook-notification-listener';
import { useStore } from '@/lib/store';
import { useAccent, type Palette, useTheme } from '@/lib/theme';

export const NOTIFICATION_SETUP_DISMISS_KEY = 'nook:notificationSetupDismissed';

// Installer packages that route through the Play Store. Anything else
// (including null/empty/shell installer) is treated as sideloaded so we
// show the restricted-settings step defensively.
const PLAY_STORE_INSTALLERS = new Set(['com.android.vending']);

/**
 * OEM skins whose background-process management stops a NotificationListener
 * from ever binding (or kills it shortly after) unless the user also grants
 * Autostart and a battery exemption. Granting Notification Access alone is not
 * enough on these, which is why capture can work on one phone and silently do
 * nothing on another with identical in-app settings.
 */
const RESTRICTIVE_OEM_RE = /xiaomi|redmi|poco|oppo|realme|oneplus|vivo|iqoo|meizu|huawei|honor/i;

export function NotificationAccessSetup() {
  const { palette } = useTheme();
  const accent = useAccent();
  const styles = makeStyles(palette, accent.base, accent.soft);
  const captureEnabled = useStore((s) => s.settings.notificationCaptureEnabled);

  const [granted, setGranted] = useState<boolean | null>(null);
  const [batteryExempt, setBatteryExempt] = useState<boolean>(true);
  const [restrictiveOem, setRestrictiveOem] = useState<boolean>(false);
  const [dismissed, setDismissed] = useState<boolean | null>(null);
  const [isSideloaded, setIsSideloaded] = useState<boolean>(true);

  // Load dismissal state once on mount. While it's `null` we don't render
  // anything — avoids a flash of the card before AsyncStorage resolves.
  useEffect(() => {
    AsyncStorage.getItem(NOTIFICATION_SETUP_DISMISS_KEY)
      .then((raw) => setDismissed(raw === '1'))
      .catch(() => setDismissed(false));
    setIsSideloaded(!PLAY_STORE_INSTALLERS.has(getInstallerPackageName()));
    setRestrictiveOem(RESTRICTIVE_OEM_RE.test(getManufacturer()));
  }, []);

  const refresh = useCallback(() => {
    const nowGranted = isPermissionGranted();
    setGranted((prev) => {
      // Permission revoked behind our back (OEM cleanup, app update). Clear the
      // dismissal so the card comes back instead of failing silently forever.
      if (prev === true && !nowGranted) {
        setDismissed(false);
        AsyncStorage.removeItem(NOTIFICATION_SETUP_DISMISS_KEY).catch(() => {});
      }
      return nowGranted;
    });
    setBatteryExempt(isIgnoringBatteryOptimizations());
  }, []);

  useEffect(() => {
    refresh();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  const handleDismiss = () => {
    setDismissed(true);
    AsyncStorage.setItem(NOTIFICATION_SETUP_DISMISS_KEY, '1').catch(() => {});
  };

  if (!captureEnabled) return null;
  if (granted === null || dismissed === null) return null;
  if (dismissed) return null;
  // Granted-but-not-working is the case this card previously hid from: on a
  // restrictive ROM the permission reads as on while the listener never binds,
  // so the user saw no card and no captures.
  //
  // The trigger is the ROM itself, not a liveness probe: Autostart has no
  // readable state at all, and isListenerConnected() is false for a moment
  // after cold start before Android binds us — gating on it would nag users
  // whose capture is fine. Restrictive ROM ⇒ show the steps once; the card is
  // dismissible, and Settings → Manage captured apps has the live status.
  const needsOemSteps = restrictiveOem;
  if (granted && !needsOemSteps) return null;

  let step = 0;
  const nextStep = () => (step += 1);

  return (
    <Card style={styles.card} padding={0} radius={16} elevation="sm">
      <View style={styles.header}>
        <View style={styles.iconWrap}>
          <PIcon name="bell" size={18} color={accent.base} strokeWidth={2} />
        </View>
        <View style={styles.headerText}>
          <Text style={styles.title}>
            {granted
              ? 'Finish setup so capture keeps working'
              : 'Auto-capture from notifications'}
          </Text>
          <Text style={styles.subtitle}>
            {granted
              ? 'Notification access is on, but this phone can still stop Nook from listening in the background. These two steps prevent that.'
              : 'Grant access so Nook can log expenses from your bank and UPI notifications.'}
          </Text>
        </View>
        <Pressable
          onPress={handleDismiss}
          hitSlop={8}
          accessibilityRole="button"
          accessibilityLabel="Dismiss setup"
          style={({ pressed }) => [styles.close, pressed && styles.closePressed]}
        >
          <PIcon name="close" size={16} color={palette.inkMuted} strokeWidth={2} />
        </Pressable>
      </View>

      <View style={styles.divider} />

      <View style={styles.steps}>
        {!granted && isSideloaded ? (
          <Step
            index={nextStep()}
            palette={palette}
            accent={accent.base}
            title="Allow restricted settings"
            body="Open App Info → tap the ⋮ menu (top-right) → tap “Allow restricted settings”. Skip this if the option isn't there."
            ctaLabel="Open App Info"
            onPress={openAppDetailsSettings}
          />
        ) : null}
        {!granted ? (
          <Step
            index={nextStep()}
            palette={palette}
            accent={accent.base}
            title="Turn on Notification Access"
            body="Find Nook in the list and flip the toggle on. Confirm “Allow” when prompted."
            ctaLabel="Open Notification Access"
            onPress={openPermissionSettings}
          />
        ) : null}
        {needsOemSteps && !batteryExempt ? (
          <Step
            index={nextStep()}
            palette={palette}
            accent={accent.base}
            title="Stop battery optimisation"
            body="Your phone can shut Nook's listener down in the background. Tap below and choose “Allow”."
            ctaLabel="Allow background activity"
            onPress={requestIgnoreBatteryOptimizations}
          />
        ) : null}
        {needsOemSteps ? (
          <Step
            index={nextStep()}
            palette={palette}
            accent={accent.base}
            title="Enable Autostart"
            body="Turn Autostart on for Nook, then lock Nook in the Recents screen (swipe up, long-press Nook, tap the padlock). Without this the listener never starts."
            ctaLabel="Open Autostart settings"
            onPress={openAutostartSettings}
          />
        ) : null}
        <Step
          index={nextStep()}
          palette={palette}
          accent={accent.base}
          title="Return to Nook"
          body="This card disappears automatically once capture is set up. Settings → Manage captured apps shows whether it's working."
        />
      </View>
    </Card>
  );
}

type StepProps = {
  index: number;
  palette: Palette;
  accent: string;
  title: string;
  body: string;
  ctaLabel?: string;
  onPress?: () => void;
};

function Step({ index, palette, accent, title, body, ctaLabel, onPress }: StepProps) {
  const styles = makeStepStyles(palette, accent);
  return (
    <View style={styles.row}>
      <View style={styles.bullet}>
        <Text style={styles.bulletText}>{index}</Text>
      </View>
      <View style={styles.body}>
        <Text style={styles.stepTitle}>{title}</Text>
        <Text style={styles.stepBody}>{body}</Text>
        {ctaLabel && onPress ? (
          <Pressable
            onPress={onPress}
            accessibilityRole="button"
            style={({ pressed }) => [styles.cta, pressed && styles.ctaPressed]}
          >
            <Text style={styles.ctaText}>{ctaLabel}</Text>
          </Pressable>
        ) : null}
      </View>
    </View>
  );
}

function makeStyles(palette: Palette, accentBase: string, accentSoft: string) {
  return StyleSheet.create({
    card: {
      borderWidth: 1.5,
      borderColor: `${accentBase}55`,
      overflow: 'hidden',
    },
    header: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      paddingHorizontal: 14,
      paddingTop: 14,
      paddingBottom: 12,
      gap: 12,
    },
    iconWrap: {
      width: 32,
      height: 32,
      borderRadius: 16,
      backgroundColor: accentSoft,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 2,
    },
    headerText: {
      flex: 1,
    },
    title: {
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
      color: palette.ink,
      marginBottom: 2,
    },
    subtitle: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    close: {
      width: 28,
      height: 28,
      borderRadius: 14,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: -2,
      marginRight: -4,
    },
    closePressed: {
      opacity: 0.5,
    },
    divider: {
      height: 1,
      backgroundColor: palette.border,
      marginHorizontal: 14,
    },
    steps: {
      paddingHorizontal: 14,
      paddingTop: 12,
      paddingBottom: 14,
      gap: 14,
    },
  });
}

function makeStepStyles(palette: Palette, accent: string) {
  return StyleSheet.create({
    row: {
      flexDirection: 'row',
      alignItems: 'flex-start',
      gap: 10,
    },
    bullet: {
      width: 22,
      height: 22,
      borderRadius: 11,
      backgroundColor: accent,
      alignItems: 'center',
      justifyContent: 'center',
      marginTop: 1,
    },
    bulletText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
      color: '#FFFFFF',
    },
    body: {
      flex: 1,
    },
    stepTitle: {
      fontFamily: 'Inter_700Bold',
      fontSize: 13,
      color: palette.ink,
      marginBottom: 2,
    },
    stepBody: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    cta: {
      alignSelf: 'flex-start',
      marginTop: 8,
      paddingHorizontal: 12,
      paddingVertical: 7,
      borderRadius: 8,
      borderWidth: 1,
      borderColor: accent,
      backgroundColor: 'transparent',
    },
    ctaPressed: {
      backgroundColor: `${accent}15`,
    },
    ctaText: {
      fontFamily: 'Inter_700Bold',
      fontSize: 12,
      color: accent,
    },
  });
}
