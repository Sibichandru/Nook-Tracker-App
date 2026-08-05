/**
 * User-facing notification capture management.
 *
 * Answers the two questions a user actually has when auto-capture isn't
 * working: "is it running?" and "why isn't my bank included?". Deliberately
 * shows no raw file contents — the JSONL queue, debug log and parse rejects
 * live in the dev inspector (`app/dev/notifications.tsx`) behind
 * FLAGS.enableDevRoutes.
 *
 * The app picker is the reason this screen is user-facing rather than dev-only:
 * the allowlist is written to a file the native service re-reads, so adding an
 * app here takes effect on the next notification with no rebuild.
 */

import { router, useFocusEffect } from 'expo-router';
import * as Sharing from 'expo-sharing';
import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import {
  AppState,
  type AppStateStatus,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import {
  openAutostartSettings,
  openPermissionSettings,
  requestIgnoreBatteryOptimizations,
  requestRebind,
} from 'nook-notification-listener';

import { Button } from '@/components/ui/Button';
import { PIcon } from '@/components/ui/PIcon';
import {
  ALLOWED_PACKAGES,
  isAllowedPackage,
  normalizePackageName,
} from '@/lib/notifications/allowlist';
import {
  buildDiagnosticsReport,
  collectDiagnostics,
  type DiagnosticsSnapshot,
} from '@/lib/notifications/diagnostics';
import { describeListenerHealth } from '@/lib/notifications/health';
import { syncAllowlist } from '@/lib/notifications/syncAllowlist';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

export default function NotificationAppsScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const [snap, setSnap] = useState<DiagnosticsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [message, setMessage] = useState<string | null>(null);

  const userPackages = useStore((s) => s.settings.notificationPackages);
  const updateSettings = useStore((s) => s.updateSettings);

  const refresh = useCallback(async () => {
    setSnap(await collectDiagnostics());
  }, []);

  // Focus covers navigating back from Settings; AppState covers returning from
  // a payment app or the system settings screen. Neither alone covers both.
  useFocusEffect(
    useCallback(() => {
      void refresh();
    }, [refresh]),
  );

  useEffect(() => {
    const sub = AppState.addEventListener('change', (s: AppStateStatus) => {
      if (s === 'active') void refresh();
    });
    return () => sub.remove();
  }, [refresh]);

  // The native side logs a package as not-allowlisted only once per connection
  // and never revisits that when the allowlist changes, so an app the user just
  // added would otherwise linger in the "add" list.
  const addable = (snap?.seenPackages ?? []).filter(
    (p) => !isAllowedPackage(p, userPackages),
  );

  const applyPackages = async (next: string[], note: string) => {
    if (busy) return;
    setBusy(true);
    try {
      // Persist before syncing, or the file is written with the pre-edit list.
      await updateSettings({ notificationPackages: next });
      await syncAllowlist();
      setMessage(note);
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const handleAdd = (pkg: string) => {
    const clean = normalizePackageName(pkg);
    if (!clean || isAllowedPackage(clean, userPackages)) return;
    void applyPackages(
      [...userPackages, clean],
      `Now capturing from ${clean}.`,
    );
  };

  const handleRemove = (pkg: string) => {
    void applyPackages(
      userPackages.filter((p) => p !== pkg),
      `Stopped capturing from ${pkg}.`,
    );
  };

  const handleRepair = async () => {
    if (busy) return;
    setBusy(true);
    requestRebind();
    // Android rebinds asynchronously — pause so the refreshed status reflects
    // the result rather than the pre-repair value.
    await new Promise((r) => setTimeout(r, 1200));
    setBusy(false);
    await refresh();
    setMessage('Repair requested.');
  };

  const handleShare = async () => {
    if (busy || !snap) return;
    setBusy(true);
    try {
      const dir = FileSystem.documentDirectory;
      if (!dir) throw new Error('No document directory available.');
      const uri = `${dir}nook-notification-diagnostics.txt`;
      await FileSystem.writeAsStringAsync(uri, buildDiagnosticsReport(snap), {
        encoding: FileSystem.EncodingType.UTF8,
      });
      if (!(await Sharing.isAvailableAsync())) {
        throw new Error('Sharing is not available on this device.');
      }
      await Sharing.shareAsync(uri, {
        mimeType: 'text/plain',
        dialogTitle: 'Nook notification diagnostics',
      });
    } catch (e) {
      setMessage(e instanceof Error ? e.message : String(e));
    } finally {
      setBusy(false);
    }
  };

  const healthColor =
    snap?.health.status === 'healthy'
      ? palette.positive
      : snap?.health.status === 'connected_idle'
        ? palette.ink
        : palette.negative;

  return (
    <SafeAreaView style={styles.safe} edges={['top']}>
      <View style={styles.header}>
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Back"
          onPress={() => router.back()}
          hitSlop={8}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <PIcon name="back" size={22} color={palette.ink} strokeWidth={2} />
        </Pressable>
        <Text style={styles.title}>Capture</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView style={styles.scroll} contentContainerStyle={styles.content}>
        <View style={[styles.statusBox, { borderColor: healthColor }]}>
          <Text style={[styles.statusText, { color: healthColor }]}>
            {snap ? describeListenerHealth(snap.health) : 'Checking…'}
          </Text>
        </View>

        {snap && !snap.granted ? (
          <Button
            label="Grant notification access"
            onPress={openPermissionSettings}
          />
        ) : null}

        {snap && snap.granted && !snap.connected ? (
          <Button label="Repair listener" onPress={handleRepair} disabled={busy} />
        ) : null}

        {snap && !snap.batteryExempt ? (
          <Button
            label="Allow background activity"
            variant="secondary"
            onPress={requestIgnoreBatteryOptimizations}
            disabled={busy}
          />
        ) : null}

        <Button
          label="Open autostart settings"
          variant="secondary"
          onPress={openAutostartSettings}
          disabled={busy}
        />

        {message ? <Text style={styles.message}>{message}</Text> : null}

        <Text style={styles.sectionLabel}>Apps seen — tap to capture</Text>
        {addable.length > 0 ? (
          <View style={styles.list}>
            {addable.map((pkg) => (
              <Row
                key={pkg}
                pkg={pkg}
                action="Add"
                actionColor={palette.positive}
                onPress={() => handleAdd(pkg)}
                disabled={busy}
                styles={styles}
              />
            ))}
          </View>
        ) : (
          <Text style={styles.hint}>
            Nothing new yet. Each app is listed only once per connection, so if
            you recently repaired the listener, trigger a notification from the
            app you want and come back.
          </Text>
        )}

        {userPackages.length > 0 ? (
          <>
            <Text style={styles.sectionLabel}>Apps you added</Text>
            <View style={styles.list}>
              {userPackages.map((pkg) => (
                <Row
                  key={pkg}
                  pkg={pkg}
                  action="Remove"
                  actionColor={palette.negative}
                  onPress={() => handleRemove(pkg)}
                  disabled={busy}
                  styles={styles}
                />
              ))}
            </View>
          </>
        ) : null}

        <Text style={styles.sectionLabel}>
          Built-in apps ({ALLOWED_PACKAGES.size})
        </Text>
        <Text style={styles.hint}>
          Major UPI apps, banks, card issuers and SMS are always captured.
        </Text>

        <Button
          label="Share diagnostics"
          variant="secondary"
          onPress={handleShare}
          disabled={busy || !snap}
        />
      </ScrollView>
    </SafeAreaView>
  );
}

function Row({
  pkg,
  action,
  actionColor,
  onPress,
  disabled,
  styles,
}: {
  pkg: string;
  action: string;
  actionColor: string;
  onPress: () => void;
  disabled: boolean;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      accessibilityLabel={`${action} ${pkg}`}
      style={({ pressed }) => [
        styles.row,
        { opacity: disabled ? 0.4 : pressed ? 0.7 : 1 },
      ]}
    >
      <Text style={styles.rowName} numberOfLines={1}>
        {pkg}
      </Text>
      <Text style={[styles.rowAction, { color: actionColor }]}>{action}</Text>
    </Pressable>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    safe: { flex: 1, backgroundColor: palette.bg },
    pressed: { opacity: 0.6 },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingVertical: 12,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 20,
      color: palette.ink,
    },
    headerSpacer: { width: 22 },
    scroll: { flex: 1 },
    content: { padding: 20, gap: 12, paddingBottom: 40 },
    statusBox: {
      padding: 14,
      borderRadius: 12,
      borderWidth: 1.5,
      backgroundColor: palette.surfaceAlt,
    },
    statusText: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 14,
      lineHeight: 20,
    },
    message: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: palette.inkMuted,
    },
    sectionLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      color: palette.inkMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: 8,
    },
    hint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      lineHeight: 18,
      color: palette.inkMuted,
    },
    list: {
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      overflow: 'hidden',
    },
    row: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingVertical: 12,
      paddingHorizontal: 12,
      backgroundColor: palette.surfaceAlt,
      borderBottomWidth: StyleSheet.hairlineWidth,
      borderBottomColor: palette.border,
      gap: 12,
    },
    rowName: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: palette.ink,
      flex: 1,
    },
    rowAction: { fontFamily: 'Inter_600SemiBold', fontSize: 12 },
  });
}
