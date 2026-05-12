import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

/**
 * Horizontally scrollable row of category filter chips. The leading "Filters"
 * chip will open the full filter sheet in iter 21; for now it's a stub.
 * Tapping a category chip sets `ui.activeCategoryFilter`, which the dashboard
 * uses to narrow `expensesInPeriod`.
 */
export function FilterChips() {
  const { accent } = useTheme();
  const categories = useStore((s) => s.categories);
  const activeFilter = useStore((s) => s.ui.activeCategoryFilter);
  const setActiveCategoryFilter = useStore((s) => s.setActiveCategoryFilter);

  const handleFilters = () => {
    // Real filter sheet wires up in iter 21.
    if (__DEV__) console.warn('Filter sheet: wired in iter 21');
  };

  return (
    <ScrollView
      horizontal
      showsHorizontalScrollIndicator={false}
      contentContainerStyle={styles.row}
    >
      <Chip
        label="Filters"
        icon="filter"
        iconColor={accent.base}
        onPress={handleFilters}
      />
      <Chip
        label="All"
        active={activeFilter === null}
        onPress={() => setActiveCategoryFilter(null)}
      />
      {categories.map((c) => (
        <Chip
          key={c.id}
          label={c.name}
          active={activeFilter === c.id}
          onPress={() => setActiveCategoryFilter(c.id)}
        />
      ))}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  row: {
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
