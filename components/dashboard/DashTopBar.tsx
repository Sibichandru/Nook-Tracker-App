import { router } from 'expo-router';
import { LinearGradient } from 'expo-linear-gradient';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import Animated, {
  Extrapolation,
  interpolate,
  type SharedValue,
  useAnimatedStyle,
} from 'react-native-reanimated';

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
  /** Shared scroll offset from the dashboard's ScrollView; drives the hairline border */
  scrollY?: SharedValue<number>;
};

export function DashTopBar({ scrollY }: DashTopBarProps) {
  const { palette } = useTheme();
  const { user } = useAuth();
  const styles = makeStyles(palette);
  const initials = initialsFromName(user?.displayName);
  const displayName = user?.displayName?.split(' ')[0] ?? 'Guest';

  // LOOP: verify on device — animated border opacity (0..1 over 0..20px scroll)
  const borderStyle = useAnimatedStyle(() => {
    const y = scrollY?.value ?? 0;
    return {
      opacity: interpolate(y, [0, 20], [0, 1], Extrapolation.CLAMP),
    };
  });

  const handleSearch = () => {
    router.push('/search' as never);
  };

  const handleReports = () => {
    router.push('/reports' as never);
  };

  return (
    <View style={styles.bar}>
      <Pressable
        accessibilityRole="button"
        accessibilityLabel="Settings"
        // Typed routes refresh on next `expo start`; cast covers the gap.
        onPress={() => router.push('/settings' as never)}
        style={styles.left}
        hitSlop={6}
      >
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
      </Pressable>

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
        {FLAGS.enableReports ? (
          <Pressable
            accessibilityRole="button"
            accessibilityLabel="Reports"
            onPress={handleReports}
            style={styles.iconButton}
            hitSlop={6}
          >
            <PIcon
              name="trend"
              size={20}
              color={palette.ink}
              strokeWidth={2}
            />
          </Pressable>
        ) : null}
      </View>

      <Animated.View
        pointerEvents="none"
        style={[
          styles.borderLine,
          { backgroundColor: palette.border },
          borderStyle,
        ]}
      />
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
    borderLine: {
      position: 'absolute',
      bottom: 0,
      left: 0,
      right: 0,
      height: StyleSheet.hairlineWidth,
    },
  });
}
