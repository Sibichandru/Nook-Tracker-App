import { router } from 'expo-router';
import { useState } from 'react';
import { Pressable, StyleSheet, Text, View } from 'react-native';
import { SafeAreaView } from 'react-native-safe-area-context';

import { OnboardSlide } from '@/components/onboarding/OnboardSlide';
import { Button } from '@/components/ui/Button';
import { NookMark, NookWordmark } from '@/components/ui/NookMark';
import { type PIconName } from '@/components/ui/PIcon';
import { StepDots } from '@/components/ui/StepDots';
import { useStore } from '@/lib/store';
import { type Palette, useTheme } from '@/lib/theme';

type Slide = {
  icon: PIconName;
  headline: string;
  body: string;
};

const SLIDES: Slide[] = [
  {
    icon: 'salary',
    headline: 'Track every rupee',
    body: 'Log expenses in seconds. Categories, tags, payment methods — captured the moment you spend.',
  },
  {
    icon: 'trend',
    headline: 'Build budgets',
    body: 'Set monthly limits per category. Watch where the money goes before it goes.',
  },
  {
    icon: 'wallet',
    headline: 'Your data, your device',
    body: 'Local-first by design. Sync to your own Google Drive later if you want.',
  },
];

export default function OnboardingScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  const updateSettings = useStore((s) => s.updateSettings);
  const [step, setStep] = useState(0);

  const finish = async () => {
    await updateSettings({ onboarded: true });
    // Send back to / so it re-evaluates against current auth state
    router.replace('/');
  };

  const handleNext = () => {
    if (step < SLIDES.length - 1) {
      setStep(step + 1);
    } else {
      void finish();
    }
  };

  const handleSkip = () => void finish();

  const slide = SLIDES[step];
  const isLast = step === SLIDES.length - 1;

  return (
    <SafeAreaView style={styles.safe}>
      <View style={styles.topBar}>
        <View style={styles.topPlaceholder} />
        <StepDots total={SLIDES.length} current={step} />
        <Pressable
          accessibilityRole="button"
          accessibilityLabel="Skip onboarding"
          hitSlop={12}
          onPress={handleSkip}
          style={({ pressed }) => pressed && styles.pressed}
        >
          <Text style={styles.skip}>Skip</Text>
        </Pressable>
      </View>

      {/* Brand the first screen only. On later slides the illustration is the
          focus, and a persistent lockup would compete with it. */}
      {step === 0 ? (
        <View style={styles.brand}>
          <NookMark size={44} />
          <NookWordmark size={26} />
        </View>
      ) : null}

      <View style={styles.body}>
        <OnboardSlide
          icon={slide.icon}
          headline={slide.headline}
          body={slide.body}
        />
      </View>

      <View style={styles.footer}>
        <Button
          label={isLast ? 'Get started' : 'Next'}
          variant="primary"
          icon={isLast ? 'check' : 'chevron'}
          onPress={handleNext}
          fullWidth
        />
      </View>
    </SafeAreaView>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    safe: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    topBar: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'space-between',
      paddingHorizontal: 20,
      paddingTop: 12,
      paddingBottom: 8,
    },
    topPlaceholder: {
      width: 50,
    },
    skip: {
      fontFamily: 'Inter_500Medium',
      fontSize: 14,
      color: palette.inkMuted,
      width: 50,
      textAlign: 'right',
    },
    pressed: {
      opacity: 0.6,
    },
    brand: {
      flexDirection: 'row',
      alignItems: 'center',
      justifyContent: 'center',
      gap: 12,
      paddingTop: 8,
    },
    body: {
      flex: 1,
      alignItems: 'center',
      justifyContent: 'center',
    },
    footer: {
      paddingHorizontal: 20,
      paddingBottom: 12,
    },
  });
}
