import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';

import { PIcon } from '@/components/ui/PIcon';
import { useAuth } from '@/lib/auth-context';
import { FLAGS } from '@/lib/featureFlags';
import { type Palette, useTheme } from '@/lib/theme';

function getGreeting(date = new Date()): string {
  const h = date.getHours();
  if (h < 12) return 'Good morning,';
  if (h < 17) return 'Good afternoon,';
  return 'Good evening,';
}

function initialsFromName(name: string | null | undefined): string {
  if (!name) return 'GU';
  const parts = name.trim().split(/\s+/);
  if (parts.length === 1) return parts[0].slice(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

type DashTopBarProps = {
  /** True once the user has scrolled past the top — drives the hairline border */
  showBorder?: boolean;
};

export function DashTopBar({ showBorder = false }: DashTopBarProps) {
  const { palette } = useTheme();
  const { user } = useAuth();
  const styles = makeStyles(palette);
  const initials = initialsFromName(user?.displayName);
  const displayName = user?.displayName?.split(' ')[0] ?? 'Guest';

  const handleSearch = () => {
    // Wired in iter 24 (Search screen).
    if (__DEV__) console.warn('Search screen not implemented yet');
  };

  const handleBell = () => {
    // Notification screen not in v1.0 scope.
  };

  return (
    <View style={[styles.bar, showBorder && styles.bordered]}>
      <View style={styles.left}>
        <LinearGradient
          colors={['#f3c28a', '#c17a5a']}
          start={{ x: 0, y: 0 }}
          end={{ x: 1, y: 1 }}
          style={styles.avatar}
        >
          <Text style={styles.avatarText}>{initials}</Text>
        </LinearGradient>
        <View>
          <Text style={styles.greeting}>{getGreeting()}</Text>
          <Text style={styles.name}>{displayName}</Text>
        </View>
      </View>

      <View style={styles.right}>
        {FLAGS.enableSearch ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Search"
            onPress={handleSearch}
            style={styles.iconButton}
            hitSlop={6}
          >
            <PIcon
              name="search"
              size={20}
              color={palette.ink}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Notifications"
          onPress={handleBell}
          style={styles.iconButton}
          hitSlop={6}
        >
          <View>
            <PIcon
              name="bell"
              size={20}
              color={palette.ink}
              strokeWidth={2}
            />
            {FLAGS.enableNotifications ? (
              <View style={[styles.dot, { backgroundColor: palette.negative }]} />
            ) : null}
          </View>
        </Pressable>
      </View>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    bar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 18,
      paddingTop: 12,
      paddingBottom: 10,
      borderBottomWidth: 0,
      borderBottomColor: palette.border,
    },
    bordered: {
      borderBottomWidth: 1,
    },
    left: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 10,
    },
    avatar: {
      width: 34,
      height: 34,
      borderRadius: 999,
      alignItems: 'center',
      justifyContent: 'center',
    },
    avatarText: {
      color: '#FFFFFF',
      fontFamily: 'Inter_600SemiBold',
      fontSize: 13,
    },
    greeting: {
      fontFamily: 'Inter_400Regular',
      fontSize: 11.5,
      color: palette.inkMuted,
    },
    name: {
      fontFamily: 'Inter_700Bold',
      fontSize: 15,
      color: palette.ink,
      lineHeight: 17,
    },
    right: {
      flexDirection: 'row',
      alignItems: 'center',
      gap: 4,
    },
    iconButton: {
      width: 38,
      height: 38,
      alignItems: 'center',
      justifyContent: 'center',
    },
    dot: {
      position: 'absolute',
      top: -2,
      right: -2,
      width: 7,
      height: 7,
      borderRadius: 999,
    },
  });
}
