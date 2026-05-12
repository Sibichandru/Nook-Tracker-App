import { StyleSheet, Text, View } from 'react-native';

import { IconCircle } from '@/components/ui/IconCircle';
import { type PIconName } from '@/components/ui/PIcon';
import { type Palette, useTheme } from '@/lib/theme';

type OnboardSlideProps = {
  icon: PIconName;
  headline: string;
  body: string;
};

export function OnboardSlide({ icon, headline, body }: OnboardSlideProps) {
  const { palette, accent } = useTheme();
  const styles = makeStyles(palette);

  return (
    <View style={styles.slide}>
      <IconCircle name={icon} color={accent.base} size={96} solid />
      <Text style={styles.headline}>{headline}</Text>
      <Text style={styles.body}>{body}</Text>
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    slide: {
      alignItems: 'center',
      gap: 20,
      paddingHorizontal: 24,
    },
    headline: {
      fontFamily: 'DMSerifDisplay_400Regular',
      fontSize: 32,
      letterSpacing: -0.6,
      color: palette.ink,
      textAlign: 'center',
      lineHeight: 38,
    },
    body: {
      fontFamily: 'Inter_400Regular',
      fontSize: 15,
      lineHeight: 22,
      color: palette.inkMuted,
      textAlign: 'center',
      maxWidth: 320,
    },
  });
}
