import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { BarChart } from '@/components/dashboard/charts/BarChart';
import { BudgetRing } from '@/components/dashboard/charts/BudgetRing';
import { DonutChart } from '@/components/dashboard/charts/DonutChart';
import { LineChart } from '@/components/dashboard/charts/LineChart';
import { Card } from '@/components/ui/Card';
import { type Palette, useTheme } from '@/lib/theme';

// ~24 days of plausible daily expense totals (₹100–₹1200 range)
const MOCK_BAR_DATA = Array.from({ length: 24 }, (_, i) => {
  const d = new Date();
  d.setDate(d.getDate() - (23 - i));
  return {
    date: d.toISOString().slice(0, 10),
    amount: Math.round(120 + Math.random() * 1080),
  };
});

const MOCK_BUCKETS = [
  { categoryId: '1', name: 'Food', color: '#E07A5F', amount: 4612 },
  { categoryId: '2', name: 'Shopping', color: '#9B6BCF', amount: 3699 },
  { categoryId: '3', name: 'Transport', color: '#4E8098', amount: 1240 },
  { categoryId: '4', name: 'Bills', color: '#7B8C4A', amount: 2139 },
  { categoryId: '5', name: 'Fun', color: '#D36FA2', amount: 950 },
  { categoryId: '6', name: 'Coffee', color: '#8D6748', amount: 620 },
];

export default function ChartsDevScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);
  return (
    <ScrollView
      style={styles.scroll}
      contentContainerStyle={styles.container}
    >
      <Section title="BarChart — 24 days, today highlighted" palette={palette}>
        <Card padding={16} radius={20} elevation="sm">
          <BarChart data={MOCK_BAR_DATA} />
        </Card>
      </Section>

      <Section title="DonutChart — top 6 categories" palette={palette}>
        <Card padding={16} radius={20} elevation="sm">
          <DonutChart buckets={MOCK_BUCKETS} />
        </Card>
      </Section>

      <Section title="DonutChart — empty buckets" palette={palette}>
        <Card padding={16} radius={20} elevation="sm">
          <DonutChart buckets={[]} />
        </Card>
      </Section>

      <Section
        title="LineChart — 30 days with budget overlay"
        palette={palette}
      >
        <Card padding={16} radius={20} elevation="sm">
          <LineChart data={MOCK_BAR_DATA.slice(-30)} budgetPerDay={700} />
        </Card>
      </Section>

      <Section title="LineChart — no budget" palette={palette}>
        <Card padding={16} radius={20} elevation="sm">
          <LineChart data={MOCK_BAR_DATA.slice(-30)} />
        </Card>
      </Section>

      <Section title="BudgetRing — under budget" palette={palette}>
        <Card padding={16} radius={20} elevation="sm">
          <BudgetRing used={32500} budget={50000} />
        </Card>
      </Section>

      <Section title="BudgetRing — over budget" palette={palette}>
        <Card padding={16} radius={20} elevation="sm">
          <BudgetRing used={58200} budget={50000} />
        </Card>
      </Section>

      <Section title="BudgetRing — no budget set" palette={palette}>
        <Card padding={16} radius={20} elevation="sm">
          <BudgetRing used={5000} budget={0} />
        </Card>
      </Section>
    </ScrollView>
  );
}

function Section({
  title,
  children,
  palette,
}: {
  title: string;
  children: React.ReactNode;
  palette: Palette;
}) {
  return (
    <View style={{ gap: 8 }}>
      <Text
        style={{
          fontFamily: 'Inter_600SemiBold',
          fontSize: 14,
          color: palette.inkMuted,
        }}
      >
        {title}
      </Text>
      {children}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    scroll: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    container: {
      padding: 16,
      gap: 20,
      paddingBottom: 60,
    },
  });
}
