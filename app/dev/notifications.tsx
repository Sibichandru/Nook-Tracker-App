import * as FileSystem from 'expo-file-system/legacy';
import { useCallback, useEffect, useState } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';

import { openPermissionSettings, requestRebind } from 'nook-notification-listener';

import {
  collectDiagnostics,
  type DiagnosticsSnapshot,
} from '@/lib/notifications/diagnostics';
import { drainNotificationQueue } from '@/lib/notifications/drain';
import { describeListenerHealth } from '@/lib/notifications/health';
import { syncAllowlist } from '@/lib/notifications/syncAllowlist';
import { type Palette, useTheme } from '@/lib/theme';

/**
 * Raw inspector for the notification capture pipeline. Dev-only — gated by
 * FLAGS.enableDevRoutes via app/dev/_layout.tsx.
 *
 * This dumps the actual files: the JSONL queue the native service writes, the
 * listener debug log, the on-disk allowlist, and the lines the parser rejected.
 * Plus the destructive/manual controls (drain now, truncate, re-sync).
 *
 * The user-facing half — health summary and the tap-to-add app picker — lives
 * at `app/(app)/notification-apps.tsx`. Package management deliberately exists
 * in exactly one place; don't add an editor here too.
 */
export default function NotificationsDevScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const [snap, setSnap] = useState<DiagnosticsSnapshot | null>(null);
  const [busy, setBusy] = useState(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    setSnap(await collectDiagnostics());
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const run = async (label: string, fn: () => Promise<string>) => {
    if (busy) return;
    setBusy(true);
    setLastAction(null);
    try {
      setLastAction(await fn());
    } catch (e) {
      setLastAction(
        `${label} error: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const handleDrain = () =>
    run('Drain', async () => {
      const r = await drainNotificationQueue();
      return `Drained: ${r.inserted} inserted, ${r.skipped} skipped, ${r.invalid} invalid.`;
    });

  const handleSyncAllowlist = () =>
    run('Allowlist sync', async () => {
      const r = await syncAllowlist();
      return r.status === 'written'
        ? `Allowlist written (${r.count} packages).`
        : `Allowlist sync skipped (${r.reason}).`;
    });

  const truncate = (rawPath: string, label: string) =>
    run(label, async () => {
      const uri = rawPath.startsWith('file://') ? rawPath : `file://${rawPath}`;
      await FileSystem.writeAsStringAsync(uri, '', {
        encoding: FileSystem.EncodingType.UTF8,
      });
      return `${label} truncated.`;
    });

  const confirmTruncate = (path: string, label: string, warning: string) => {
    Alert.alert(`Clear ${label.toLowerCase()}?`, warning, [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Clear',
        style: 'destructive',
        onPress: () => void truncate(path, label),
      },
    ]);
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notification inspector</Text>
      <Text style={styles.hint}>
        Raw pipeline state. The user-facing capture screen is Settings &rarr;
        Manage captured apps.
      </Text>

      <Text style={styles.value}>
        {snap ? describeListenerHealth(snap.health) : 'Checking…'}
      </Text>

      <Stat label="Permission" value={snap?.granted ? 'Granted' : 'Not granted'} styles={styles} />
      <Stat label="Listener bound" value={snap?.connected ? 'Connected' : 'Not connected'} styles={styles} />
      <Stat label="Battery exempt" value={snap?.batteryExempt ? 'Yes' : 'No'} styles={styles} />
      <Stat label="Device" value={snap?.manufacturer || '(unknown)'} styles={styles} />
      <Stat label="Queue size" value={`${snap?.queue.size ?? 0} bytes`} styles={styles} />

      <View style={styles.buttonRow}>
        <ActionButton label="Grant" variant="secondary" palette={palette} disabled={busy} onPress={openPermissionSettings} />
        <ActionButton label="Rebind" variant="secondary" palette={palette} disabled={busy} onPress={() => { requestRebind(); void refresh(); }} />
        <ActionButton label="Refresh" variant="secondary" palette={palette} disabled={busy} onPress={() => void refresh()} />
      </View>

      <View style={styles.buttonRow}>
        <ActionButton label="Drain now" variant="primary" palette={palette} disabled={busy || !snap?.granted} onPress={handleDrain} />
        <ActionButton label="Re-sync allowlist" variant="secondary" palette={palette} disabled={busy} onPress={handleSyncAllowlist} />
      </View>

      <View style={styles.buttonRow}>
        <ActionButton
          label="Clear queue"
          variant="danger"
          palette={palette}
          disabled={busy || !snap || snap.queue.size === 0}
          onPress={() =>
            confirmTruncate(
              snap?.queuePath ?? '',
              'Queue',
              'Anything not yet drained will be lost.',
            )
          }
        />
        <ActionButton
          label="Clear log"
          variant="danger"
          palette={palette}
          disabled={busy || !snap || snap.debugLog.size === 0}
          onPress={() =>
            confirmTruncate(
              snap?.debugLogPath ?? '',
              'Debug log',
              'Past capture events become unrecoverable, and the app-discovery list on the capture screen resets until the listener reconnects.',
            )
          }
        />
      </View>

      {lastAction ? (
        <View style={styles.lastActionBox}>
          <Text style={styles.lastActionText}>{lastAction}</Text>
        </View>
      ) : null}

      <Dump label="Queue (JSONL)" body={snap?.queue.contents ?? ''} styles={styles} />
      <Dump label="Parse rejects" body={snap?.rejects.contents ?? ''} styles={styles} />
      <Dump
        label={`Debug log (${snap?.debugLog.size ?? 0} bytes, newest first)`}
        body={
          snap && !snap.debugLog.placeholder
            ? snap.debugLog.contents.split('\n').filter(Boolean).reverse().join('\n')
            : (snap?.debugLog.contents ?? '')
        }
        styles={styles}
      />
      <Dump label="Allowlist (on disk)" body={snap?.allowlist.contents ?? ''} styles={styles} />
    </ScrollView>
  );
}

function Stat({
  label,
  value,
  styles,
}: {
  label: string;
  value: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <View style={styles.statBlock}>
      <Text style={styles.statLabel}>{label}</Text>
      <Text style={styles.statValue}>{value}</Text>
    </View>
  );
}

function Dump({
  label,
  body,
  styles,
}: {
  label: string;
  body: string;
  styles: ReturnType<typeof makeStyles>;
}) {
  return (
    <>
      <Text style={styles.contentsLabel}>{label}</Text>
      <View style={styles.contentsBox}>
        <Text style={styles.contentsText} selectable>
          {body}
        </Text>
      </View>
    </>
  );
}

function ActionButton({
  label,
  variant,
  onPress,
  palette,
  disabled,
}: {
  label: string;
  variant: 'primary' | 'secondary' | 'danger';
  onPress: () => void;
  palette: Palette;
  disabled?: boolean;
}) {
  const bg =
    variant === 'primary'
      ? palette.ink
      : variant === 'danger'
        ? 'transparent'
        : palette.surfaceAlt;
  const fg =
    variant === 'primary'
      ? palette.bg
      : variant === 'danger'
        ? palette.negative
        : palette.ink;
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      accessibilityRole="button"
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: bg,
        borderWidth: variant === 'danger' ? 1 : 0,
        borderColor: variant === 'danger' ? palette.negative : 'transparent',
        alignItems: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
    >
      <Text
        style={{ fontFamily: 'Inter_600SemiBold', fontSize: 12, color: fg }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    scroll: { flex: 1, backgroundColor: palette.bg },
    container: { padding: 20, gap: 12 },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 24,
      color: palette.ink,
    },
    hint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 13,
      color: palette.inkMuted,
      lineHeight: 18,
    },
    value: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      color: palette.ink,
    },
    statBlock: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 10,
      paddingHorizontal: 12,
      backgroundColor: palette.surfaceAlt,
      borderRadius: 10,
      gap: 12,
    },
    statLabel: {
      fontFamily: 'Inter_500Medium',
      fontSize: 13,
      color: palette.inkMuted,
    },
    statValue: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
      color: palette.ink,
      flexShrink: 1,
      textAlign: 'right',
    },
    buttonRow: { flexDirection: 'row', gap: 10 },
    lastActionBox: {
      padding: 12,
      backgroundColor: palette.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
    },
    lastActionText: {
      fontFamily: 'Inter_500Medium',
      fontSize: 12,
      color: palette.ink,
    },
    contentsLabel: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 12,
      color: palette.inkMuted,
      letterSpacing: 0.4,
      textTransform: 'uppercase',
      marginTop: 6,
    },
    contentsBox: {
      padding: 12,
      backgroundColor: palette.surfaceAlt,
      borderRadius: 10,
      borderWidth: 1,
      borderColor: palette.border,
      minHeight: 100,
    },
    contentsText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: palette.ink,
      lineHeight: 16,
    },
  });
}
