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

import {
  getAllowlistPath,
  getDebugLogPath,
  getQueuePath,
  isPermissionGranted,
  openPermissionSettings,
} from 'nook-notification-listener';

import { drainNotificationQueue } from '@/lib/notifications/drain';
import { syncAllowlist } from '@/lib/notifications/syncAllowlist';
import { type Palette, useTheme } from '@/lib/theme';

/**
 * Dev-only screen for verifying the iter 33 notification capture service
 * before iter 34's foreground drain has landed in the main app shell.
 *
 *   1. Check whether Notification Access has been granted
 *   2. Jump to the system settings screen to grant it
 *   3. Read the raw JSONL queue the native service writes to
 *   4. Trigger the drain manually (parse + insert pending expenses)
 *   5. Clear the queue file (truncate)
 *
 * Use this loop to confirm a real bank/UPI notification gets captured before
 * trusting the auto-import flow.
 */
export default function NotificationsDevScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  const [granted, setGranted] = useState<boolean>(false);
  const [queuePath, setQueuePath] = useState<string>('');
  const [queueContents, setQueueContents] = useState<string>('');
  const [queueSize, setQueueSize] = useState<number>(0);
  const [debugLogPath, setDebugLogPath] = useState<string>('');
  const [debugLogContents, setDebugLogContents] = useState<string>('');
  const [debugLogSize, setDebugLogSize] = useState<number>(0);
  const [allowlistPath, setAllowlistPath] = useState<string>('');
  const [allowlistContents, setAllowlistContents] = useState<string>('');
  const [busy, setBusy] = useState<boolean>(false);
  const [lastAction, setLastAction] = useState<string | null>(null);

  const refresh = useCallback(async () => {
    const g = isPermissionGranted();
    const path = getQueuePath();
    const logPath = getDebugLogPath();
    const allowPath = getAllowlistPath();
    setGranted(g);
    setQueuePath(path);
    setDebugLogPath(logPath);
    setAllowlistPath(allowPath);

    const readFile = async (
      p: string,
      emptyLabel: string,
    ): Promise<{ contents: string; size: number }> => {
      if (!p) return { contents: '', size: 0 };
      const fileUri = p.startsWith('file://') ? p : `file://${p}`;
      try {
        const info = await FileSystem.getInfoAsync(fileUri);
        if (!info.exists) {
          return { contents: emptyLabel, size: 0 };
        }
        const contents = await FileSystem.readAsStringAsync(fileUri, {
          encoding: FileSystem.EncodingType.UTF8,
        });
        return {
          contents: contents.length === 0 ? '(empty)' : contents,
          size: info.size ?? 0,
        };
      } catch (e) {
        return {
          contents: `Error reading file: ${e instanceof Error ? e.message : String(e)}`,
          size: 0,
        };
      }
    };

    const queue = await readFile(
      path,
      '(file does not exist yet — no notifications captured)',
    );
    setQueueContents(queue.contents);
    setQueueSize(queue.size);

    const debug = await readFile(
      logPath,
      '(file does not exist yet — service has never fired)',
    );
    // Show newest events at the top — easier to skim live capture activity
    // without scrolling through ancient CONNECTED lines.
    const reversed =
      debug.contents.startsWith('(') || debug.contents.startsWith('Error')
        ? debug.contents
        : debug.contents.split('\n').filter(Boolean).reverse().join('\n');
    setDebugLogContents(reversed);
    setDebugLogSize(debug.size);

    const allowFile = await readFile(
      allowPath,
      '(not written yet — service is using its baseline allowlist)',
    );
    setAllowlistContents(allowFile.contents);
  }, []);

  useEffect(() => {
    void refresh();
  }, [refresh]);

  const handleGrant = () => {
    openPermissionSettings();
    setLastAction(
      'Settings opened — flip Nook on, then come back and Refresh.',
    );
  };

  const handleDrain = async () => {
    if (busy) return;
    setBusy(true);
    setLastAction(null);
    try {
      const result = await drainNotificationQueue();
      setLastAction(
        `Drained: ${result.inserted} inserted, ${result.skipped} skipped, ${result.invalid} invalid lines.`,
      );
    } catch (e) {
      setLastAction(
        `Drain error: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const truncateFile = async (rawPath: string, label: string) => {
    setBusy(true);
    try {
      const fileUri = rawPath.startsWith('file://')
        ? rawPath
        : `file://${rawPath}`;
      await FileSystem.writeAsStringAsync(fileUri, '', {
        encoding: FileSystem.EncodingType.UTF8,
      });
      setLastAction(`${label} truncated.`);
    } catch (e) {
      setLastAction(
        `Clear error: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  const handleClear = () => {
    Alert.alert(
      'Clear queue file?',
      'Truncates pending-notifications.jsonl. Anything not yet drained will be lost.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => truncateFile(queuePath, 'Queue'),
        },
      ],
    );
  };

  const handleClearDebug = () => {
    Alert.alert(
      'Clear debug log?',
      'Truncates listener-debug.log. Past capture events become unrecoverable.',
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Clear',
          style: 'destructive',
          onPress: () => truncateFile(debugLogPath, 'Debug log'),
        },
      ],
    );
  };

  const handleSyncAllowlist = async () => {
    if (busy) return;
    setBusy(true);
    setLastAction(null);
    try {
      const result = await syncAllowlist();
      setLastAction(
        result.status === 'written'
          ? `Allowlist written (${result.count} packages).`
          : `Allowlist sync skipped (${result.reason}).`,
      );
    } catch (e) {
      setLastAction(
        `Allowlist sync error: ${e instanceof Error ? e.message : String(e)}`,
      );
    } finally {
      setBusy(false);
      await refresh();
    }
  };

  return (
    <ScrollView style={styles.scroll} contentContainerStyle={styles.container}>
      <Text style={styles.title}>Notification capture</Text>
      <Text style={styles.hint}>
        Inspect the raw JSONL queue and exercise the foreground drain without
        having to background and re-open the app.
      </Text>

      <View style={styles.statBlock}>
        <Text style={styles.statLabel}>Permission</Text>
        <Text
          style={[
            styles.statValue,
            { color: granted ? palette.positive : palette.negative },
          ]}
        >
          {granted ? 'Granted' : 'Not granted'}
        </Text>
      </View>

      <View style={styles.statBlock}>
        <Text style={styles.statLabel}>Queue path</Text>
        <Text style={styles.statValueMono} selectable>
          {queuePath || '(unavailable)'}
        </Text>
      </View>

      <View style={styles.statBlock}>
        <Text style={styles.statLabel}>Queue size</Text>
        <Text style={styles.statValue}>{queueSize} bytes</Text>
      </View>

      <View style={styles.buttonRow}>
        <ActionButton
          label="Grant permission"
          variant="primary"
          onPress={handleGrant}
          palette={palette}
          disabled={busy}
        />
        <ActionButton
          label="Refresh"
          variant="secondary"
          onPress={refresh}
          palette={palette}
          disabled={busy}
        />
      </View>

      <View style={styles.buttonRow}>
        <ActionButton
          label="Drain now"
          variant="primary"
          onPress={handleDrain}
          palette={palette}
          disabled={busy || !granted}
        />
        <ActionButton
          label="Clear queue"
          variant="danger"
          onPress={handleClear}
          palette={palette}
          disabled={busy || queueSize === 0}
        />
      </View>

      <View style={styles.buttonRow}>
        <ActionButton
          label="Re-sync allowlist"
          variant="secondary"
          onPress={handleSyncAllowlist}
          palette={palette}
          disabled={busy}
        />
      </View>

      {lastAction ? (
        <View style={styles.lastActionBox}>
          <Text style={styles.lastActionText}>{lastAction}</Text>
        </View>
      ) : null}

      <Text style={styles.contentsLabel}>Queue contents (JSONL)</Text>
      <View style={styles.contentsBox}>
        <Text style={styles.contentsText} selectable>
          {queueContents}
        </Text>
      </View>

      <View style={styles.debugHeader}>
        <Text style={styles.contentsLabel}>
          Debug log ({debugLogSize} bytes, newest first)
        </Text>
        <Pressable
          onPress={handleClearDebug}
          disabled={busy || debugLogSize === 0}
          hitSlop={8}
          style={({ pressed }) => [
            styles.miniButton,
            {
              borderColor: palette.negative,
              opacity:
                busy || debugLogSize === 0 ? 0.4 : pressed ? 0.7 : 1,
            },
          ]}
          accessibilityRole="button"
        >
          <Text
            style={{
              fontFamily: 'Inter_600SemiBold',
              fontSize: 11,
              color: palette.negative,
            }}
          >
            Clear
          </Text>
        </Pressable>
      </View>
      <View style={styles.contentsBox}>
        <Text style={styles.contentsText} selectable>
          {debugLogContents}
        </Text>
      </View>

      <Text style={styles.contentsLabel}>Allowlist (on disk)</Text>
      <Text style={styles.allowlistPathHint} selectable>
        {allowlistPath || '(unavailable on this APK)'}
      </Text>
      <View style={styles.contentsBox}>
        <Text style={styles.contentsText} selectable>
          {allowlistContents}
        </Text>
      </View>
    </ScrollView>
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
  const border =
    variant === 'danger' ? palette.negative : 'transparent';
  return (
    <Pressable
      onPress={onPress}
      disabled={disabled}
      style={({ pressed }) => ({
        flex: 1,
        paddingVertical: 12,
        borderRadius: 10,
        backgroundColor: bg,
        borderWidth: variant === 'danger' ? 1 : 0,
        borderColor: border,
        alignItems: 'center',
        opacity: disabled ? 0.4 : pressed ? 0.7 : 1,
      })}
      accessibilityRole="button"
    >
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 13,
          color: fg,
        }}
      >
        {label}
      </Text>
    </Pressable>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    container: {
      padding: 20,
      gap: 14,
    },
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
    },
    statValueMono: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: palette.ink,
      flex: 1,
      textAlign: 'right',
    },
    buttonRow: {
      flexDirection: 'row',
      gap: 10,
    },
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
      minHeight: 120,
    },
    contentsText: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: palette.ink,
      lineHeight: 16,
    },
    debugHeader: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      marginTop: 6,
    },
    miniButton: {
      paddingVertical: 4,
      paddingHorizontal: 10,
      borderRadius: 8,
      borderWidth: 1,
      backgroundColor: 'transparent',
    },
    allowlistPathHint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 10,
      color: palette.inkSoft,
      marginTop: -8,
      marginBottom: 2,
    },
  });
}
