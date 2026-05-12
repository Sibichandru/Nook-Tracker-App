import { ScrollView, StyleSheet, Text, View } from 'react-native';

import { Button } from '@/components/ui/Button';
import { Card } from '@/components/ui/Card';
import { Chip } from '@/components/ui/Chip';
import { FAB } from '@/components/ui/FAB';
import { IconCircle } from '@/components/ui/IconCircle';
import { type Palette, useTheme } from '@/lib/theme';

export default function PrimitivesDevScreen() {
  const { palette } = useTheme();
  const styles = makeStyles(palette);

  return (
    <View style={styles.root}>
      <ScrollView
        style={styles.scroll}
        contentContainerStyle={styles.container}
      >
        <Section title="Button — variants × sizes" palette={palette}>
          <Row>
            <Button label="Primary" variant="primary" />
            <Button label="Secondary" variant="secondary" />
            <Button label="Ghost" variant="ghost" />
          </Row>
          <Row>
            <Button label="Small" size="sm" />
            <Button label="Medium" size="md" />
            <Button label="Large" size="lg" />
          </Row>
          <Row>
            <Button label="With icon" icon="plus" />
            <Button label="Loading" loading />
            <Button label="Disabled" disabled />
          </Row>
        </Section>

        <Section title="Chip — active / inactive" palette={palette}>
          <Row>
            <Chip label="All" active />
            <Chip label="Food" onPress={() => {}} />
            <Chip label="Transport" onPress={() => {}} />
          </Row>
          <Row>
            <Chip label="Filters" icon="filter" onPress={() => {}} />
            <Chip label="With icon" icon="tag" iconColor="#9B6BCF" />
          </Row>
        </Section>

        <Section title="IconCircle — colors + sizes" palette={palette}>
          <Row>
            <IconCircle name="food" color="#E07A5F" />
            <IconCircle name="transport" color="#4E8098" />
            <IconCircle name="shopping" color="#9B6BCF" />
            <IconCircle name="home" color="#C78A1A" size={44} />
          </Row>
          <Row>
            <IconCircle name="health" color="#3C9D8E" solid />
            <IconCircle name="travel" color="#5B6BE1" size={28} />
          </Row>
        </Section>

        <Section title="Card — elevations" palette={palette}>
          <Card elevation="none">
            <Text style={styles.cardText}>Elevation: none</Text>
          </Card>
          <View style={styles.cardSpacer} />
          <Card elevation="sm">
            <Text style={styles.cardText}>Elevation: sm</Text>
          </Card>
          <View style={styles.cardSpacer} />
          <Card elevation="md">
            <Text style={styles.cardText}>Elevation: md</Text>
          </Card>
        </Section>
      </ScrollView>

      <View style={styles.fabPin}>
        <FAB onPress={() => {}} />
      </View>
    </View>
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

function Row({ children }: { children: React.ReactNode }) {
  return (
    <View
      style={{
        flexDirection: 'row',
        flexWrap: 'wrap',
        gap: 8,
        alignItems: 'center',
      }}
    >
      {children}
    </View>
  );
}

function makeStyles(palette: Palette) {
  return StyleSheet.create({
    root: {
      flex: 1,
      backgroundColor: palette.bg,
    },
    scroll: {
      flex: 1,
    },
    container: {
      padding: 16,
      gap: 20,
      paddingBottom: 100,
    },
    cardSpacer: {
      height: 8,
    },
    cardText: {
      fontFamily: 'Inter_400Regular',
      color: palette.ink,
    },
    fabPin: {
      position: 'absolute',
      right: 18,
      bottom: 22,
    },
  });
}
