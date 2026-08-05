import AsyncStorage from '@react-native-async-storage/async-storage';
import { router } from 'expo-router';
import { type ReactNode } from 'react';
import {
  Alert,
  Pressable,
  ScrollView,
  StyleSheet,
  Text,
  View,
} from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { NOTIFICATION_SETUP_DISMISS_KEY } from '@/components/dashboard/NotificationAccessSetup';
import { AccentSwatchRow } from '@/components/settings/AccentSwatchRow';
import { CategoryManager } from '@/components/settings/CategoryManager';
import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { PIcon } from '@/components/ui/PIcon';
import { SegmentedControl } from '@/components/ui/SegmentedControl';
import { Toggle } from '@/components/ui/Toggle';
import { signOutAll } from '@/lib/auth';
import { useAuth } from '@/lib/auth-context';
import { exportAndShareExpenses } from '@/lib/export';
import { FLAGS } from '@/lib/featureFlags';
import { pickAndParseCSV } from '@/lib/import';
import {
  cancelPendingReminder,
  ensureReminderChannel,
  REMINDER_DELAY_HOURS,
  requestReminderPermission,
} from '@/lib/notifications/reminder';
import { useStore } from '@/lib/store';
import {
  type AccentKey,
  type Palette,
  type Scheme,
  useTheme,
} from '@/lib/theme';
import type { Density } from '@/lib/types';

export default function SettingsScreen() {
  const { palette, scheme, accentKey, setScheme, setAccent } = useTheme();
  const styles = makeStyles(palette);
  const { user } = useAuth();
  const settings = useStore((s) => s.settings);
  const updateSettings = useStore((s) => s.updateSettings);
  const expenses = useStore((s) => s.expenses);
  const categories = useStore((s) => s.categories);

  const addExpense = useStore((s) => s.addExpense);

  const handleExport = async () => {
    try {
      const categoriesById = new Map(categories.map((c) => [c.id, c]));
      // Default export = confirmed rows only. Pending detections aren't user
      // expenses yet; rejected rows are soft-deleted noise. Iter 35 will add
      // toggles for including either.
      const exportable = expenses.filter((e) => e.status === 'confirmed');
      await exportAndShareExpenses(exportable, categoriesById);
    } catch (e) {
      Alert.alert(
        'Could not export',
        e instanceof Error ? e.message : 'Unknown error',
      );
    }
  };

  const handleImport = async () => {
    let picked;
    try {
      picked = await pickAndParseCSV(categories);
    } catch (e) {
      Alert.alert(
        'Could not read file',
        e instanceof Error ? e.message : 'Unknown error',
      );
      return;
    }
    if (picked.kind === 'cancelled') return;
    const { result, filename } = picked;
    if (result.valid.length === 0) {
      Alert.alert(
        'Nothing to import',
        `No usable rows found in ${filename}. ${result.invalid.length} row(s) were rejected.`,
      );
      return;
    }
    const sampleErrors = result.invalid
      .slice(0, 3)
      .map((e) => `  · row ${e.row}: ${e.reason}`)
      .join('\n');
    const errSummary = result.invalid.length
      ? `\n\nSkipping ${result.invalid.length} invalid row(s):\n${sampleErrors}${
          result.invalid.length > 3 ? '\n  · …' : ''
        }`
      : '';
    Alert.alert(
      'Import preview',
      `Found ${result.valid.length} transaction(s) in ${filename}.${errSummary}\n\nImport them now? Existing rows are kept; imported rows get fresh IDs.`,
      [
        { text: 'Cancel', style: 'cancel' },
        {
          text: 'Import',
          onPress: async () => {
            try {
              for (const row of result.valid) {
                await addExpense(row);
              }
              Alert.alert(
                'Imported',
                `${result.valid.length} transaction(s) added.`,
              );
            } catch (e) {
              Alert.alert(
                'Import failed',
                e instanceof Error ? e.message : 'Unknown error',
              );
            }
          },
        },
      ],
    );
  };

  const handleSignOut = () => {
    Alert.alert('Sign out?', 'You can sign back in any time.', [
      { text: 'Cancel', style: 'cancel' },
      {
        text: 'Sign out',
        style: 'destructive',
        onPress: async () => {
          await signOutAll();
          router.replace('/login');
        },
      },
    ]);
  };

  const handleSetScheme = (s: Scheme) => {
    setScheme(s);
    void updateSettings({ themeScheme: s });
  };

  const handleSetAccent = (a: AccentKey) => {
    setAccent(a);
    void updateSettings({ accent: a });
  };

  const handleSetDensity = (d: Density) => {
    void updateSettings({ density: d });
  };

  /**
   * Asks for POST_NOTIFICATIONS only when the user opts in. If they decline
   * (or previously hard-denied, where the OS silently refuses to re-prompt) the
   * toggle stays off — showing it on while nothing can be posted would be a
   * lie the user has no way to debug.
   */
  const handleTogglePendingReminder = (next: boolean) => {
    if (!next) {
      void updateSettings({ pendingReminderEnabled: false });
      void cancelPendingReminder();
      return;
    }
    void (async () => {
      const allowed = await requestReminderPermission();
      if (!allowed) {
        Alert.alert(
          'Notifications are blocked',
          'Nook needs notification permission to remind you. Turn it on for Nook in Android Settings → Apps → Nook → Notifications.',
        );
        return;
      }
      await ensureReminderChannel();
      await updateSettings({ pendingReminderEnabled: true });
    })();
  };

  const handleToggleNotificationCapture = (next: boolean) => {
    void updateSettings({ notificationCaptureEnabled: next });
    // Clear the dashboard banner dismissal when the user re-enables capture,
    // so the setup banner reappears to guide them through permission grant.
    if (next) {
      AsyncStorage.removeItem(NOTIFICATION_SETUP_DISMISS_KEY).catch(() => {});
    }
  };

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
        <Text style={styles.title}>Settings</Text>
        <View style={styles.headerSpacer} />
      </View>

      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.scrollContent}
      >
        {user ? (
          <Card padding={16} radius={16} elevation="sm">
            <Text style={styles.profileName}>
              {user.displayName ?? 'Signed in'}
            </Text>
            <Text style={styles.profileEmail}>{user.email ?? ''}</Text>
          </Card>
        ) : (
          <Card padding={16} radius={16} elevation="sm">
            <Text style={styles.profileName}>Using as guest</Text>
            <Text style={styles.profileEmail}>
              Sign in to enable cloud backup later.
            </Text>
          </Card>
        )}

        <Section title="Appearance" palette={palette}>
          <Row label="Theme" palette={palette}>
            <SegmentedControl
              options={[
                { value: 'light', label: 'Light' },
                { value: 'dark', label: 'Dark' },
                { value: 'system', label: 'System' },
              ]}
              value={scheme}
              onChange={handleSetScheme}
            />
          </Row>
          <Row label="Accent" palette={palette}>
            <AccentSwatchRow value={accentKey} onChange={handleSetAccent} />
          </Row>
          <Row label="Density" palette={palette}>
            <SegmentedControl
              options={[
                { value: 'compact', label: 'Compact' },
                { value: 'dense', label: 'Dense' },
              ]}
              value={settings.density}
              onChange={handleSetDensity}
            />
          </Row>
        </Section>

        <Section title="Format" palette={palette}>
          <Row label="Currency" palette={palette}>
            <Text style={styles.currency}>₹ Indian Rupee</Text>
          </Row>
        </Section>

        <Section title="Notifications" palette={palette}>
          <View style={styles.toggleRow}>
            <View style={styles.toggleLabelWrap}>
              <Text style={styles.toggleLabel}>Capture from notifications</Text>
              <Text style={styles.toggleHint}>
                Auto-log expenses from bank and UPI notifications. You&rsquo;ll
                be guided to grant Android&rsquo;s Notification Access on the
                dashboard.
              </Text>
            </View>
            <Toggle
              value={settings.notificationCaptureEnabled}
              onChange={handleToggleNotificationCapture}
              accessibilityLabel="Capture expenses from notifications"
            />
          </View>
          {settings.notificationCaptureEnabled ? (
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Manage apps captured from notifications"
              onPress={() => router.push('/notification-apps' as never)}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            >
              <Text style={styles.navLabel}>Manage captured apps</Text>
              <PIcon
                name="chevron"
                size={16}
                color={palette.inkSoft}
                strokeWidth={2}
              />
            </Pressable>
          ) : null}

          <View style={styles.toggleRowSpaced}>
            <View style={styles.toggleLabelWrap}>
              <Text style={styles.toggleLabel}>Remind me to review</Text>
              <Text style={styles.toggleHint}>
                If captured expenses are left unreviewed, Nook nudges you once,
                about {REMINDER_DELAY_HOURS} hours after you close the app.
                Never while you&rsquo;re using it.
              </Text>
            </View>
            <Toggle
              value={settings.pendingReminderEnabled}
              onChange={handleTogglePendingReminder}
              accessibilityLabel="Remind me to review pending expenses"
            />
          </View>
        </Section>

        <Section title="Categories" palette={palette}>
          <CategoryManager />
        </Section>

        {FLAGS.enableExport ? (
          <Section title="Data" palette={palette}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Export expenses to CSV"
              onPress={handleExport}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            >
              <Text style={styles.navLabel}>Export to CSV</Text>
              <PIcon
                name="chevron"
                size={16}
                color={palette.inkSoft}
                strokeWidth={2}
              />
            </Pressable>
            {FLAGS.enableImport ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Import expenses from CSV"
                onPress={handleImport}
                style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              >
                <Text style={styles.navLabel}>Import from CSV</Text>
                <PIcon
                  name="chevron"
                  size={16}
                  color={palette.inkSoft}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
          </Section>
        ) : null}

        {FLAGS.enableBudgets || FLAGS.enableRecurring ? (
          <Section title="Money" palette={palette}>
            {FLAGS.enableBudgets ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open budgets"
                onPress={() => router.push('/budgets' as never)}
                style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              >
                <Text style={styles.navLabel}>Budgets</Text>
                <PIcon
                  name="chevron"
                  size={16}
                  color={palette.inkSoft}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
            {FLAGS.enableRecurring ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open recurring expenses"
                onPress={() => router.push('/recurring' as never)}
                style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              >
                <Text style={styles.navLabel}>Recurring expenses</Text>
                <PIcon
                  name="chevron"
                  size={16}
                  color={palette.inkSoft}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
          </Section>
        ) : null}

        {FLAGS.enableDevRoutes ? (
          <Section title="Developer" palette={palette}>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open notification capture inspector"
              onPress={() => router.push('/dev/notifications' as never)}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            >
              <Text style={styles.navLabel}>Notification inspector</Text>
              <PIcon
                name="chevron"
                size={16}
                color={palette.inkSoft}
                strokeWidth={2}
              />
            </Pressable>
            {FLAGS.enableDevPending ? (
              <Pressable
                accessibilityRole="button"
                accessibilityLabel="Open pending tray sandbox"
                onPress={() => router.push('/dev/pending' as never)}
                style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
              >
                <Text style={styles.navLabel}>Pending tray sandbox</Text>
                <PIcon
                  name="chevron"
                  size={16}
                  color={palette.inkSoft}
                  strokeWidth={2}
                />
              </Pressable>
            ) : null}
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open primitives sandbox"
              onPress={() => router.push('/dev/primitives' as never)}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            >
              <Text style={styles.navLabel}>Primitives sandbox</Text>
              <PIcon
                name="chevron"
                size={16}
                color={palette.inkSoft}
                strokeWidth={2}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open icons sandbox"
              onPress={() => router.push('/dev/icons' as never)}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            >
              <Text style={styles.navLabel}>Icons sandbox</Text>
              <PIcon
                name="chevron"
                size={16}
                color={palette.inkSoft}
                strokeWidth={2}
              />
            </Pressable>
            <Pressable
              accessibilityRole="button"
              accessibilityLabel="Open charts sandbox"
              onPress={() => router.push('/dev/charts' as never)}
              style={({ pressed }) => [styles.navRow, pressed && styles.pressed]}
            >
              <Text style={styles.navLabel}>Charts sandbox</Text>
              <PIcon
                name="chevron"
                size={16}
                color={palette.inkSoft}
                strokeWidth={2}
              />
            </Pressable>
          </Section>
        ) : null}

        {user ? (
          <View style={styles.signOutWrap}>
            <Button
              label="Sign out"
              variant="secondary"
              onPress={handleSignOut}
              fullWidth
            />
          </View>
        ) : null}

        <Text style={styles.versionLabel}>Nook v1.5 · local-first</Text>
      </ScrollView>
    </SafeAreaView>
  );
}

function Section({
  title,
  children,
  palette,
}: {
  title: string;
  children: ReactNode;
  palette: Palette;
}) {
  return (
    <View style={{ gap: 10 }}>
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 12,
          letterSpacing: 0.4,
          textTransform: 'uppercase',
          color: palette.inkMuted,
          paddingHorizontal: 4,
        }}
      >
        {title}
      </Text>
      <Card padding={14} radius={14} elevation="sm">
        <View style={{ gap: 16 }}>{children}</View>
      </Card>
    </View>
  );
}

function Row({
  label,
  children,
  palette,
}: {
  label: string;
  children: ReactNode;
  palette: Palette;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontFamily: 'Inter_500Medium',
          fontSize: 12,
          color: palette.inkMuted,
        }}
      >
        {label}
      </Text>
      {children}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    header: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 12,
    },
    headerSpacer: {
      width: 22,
    },
    title: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 22,
      color: palette.ink,
      letterSpacing: -0.4,
    },
    pressed: {
      opacity: 0.7,
    },
    scroll: {
      flex: 1,
    },
    scrollContent: {
      padding: 16,
      gap: 18,
      paddingBottom: 60,
    },
    profileName: {
      fontFamily: 'Inter_600SemiBold',
      fontSize: 15,
      color: palette.ink,
    },
    profileEmail: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      color: palette.inkMuted,
      marginTop: 2,
    },
    currency: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
    },
    signOutWrap: {
      marginTop: 8,
    },
    versionLabel: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11,
      color: palette.inkSoft,
      textAlign: 'center',
      marginTop: 12,
    },
    navRow: {
      flexDirection: 'row',
      justifyContent: 'space-between',
      alignItems: 'center',
      paddingVertical: 8,
    },
    navLabel: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
    },
    toggleRow: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
    },
    // Sibling toggle rows have no inherent spacing between them.
    toggleRowSpaced: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 12,
      marginTop: 18,
    },
    toggleLabelWrap: {
      flex: 1,
    },
    toggleLabel: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.ink,
    },
    toggleHint: {
      fontFamily: 'Inter_400Regular',
      fontSize: 12,
      lineHeight: 16,
      color: palette.inkMuted,
      marginTop: 4,
    },
  });
}
