import { forwardRef, type RefObject } from 'react';
import { ScrollView, StyleSheet } from 'react-native';

import { Chip } from '@/components/ui/Chip';
import { useStore } from '@/lib/store';
import { useTheme } from '@/lib/theme';

import { type FilterSheetRef } from './FilterSheet';

type FilterChipsProps = {
  filterSheetRef: RefObject<FilterSheetRef | null>;
};

/**
 * Horizontally scrollable row of category filter chips. The leading "Filters"
 * chip opens the full filter sheet (iter 21). Tapping a category chip sets
 * `ui.activeCategoryFilter`, which narrows the dashboard's transactions list.
 */
export const FilterChips = forwardRef<ScrollView, FilterChipsProps>(
  function FilterChips({ filterSheetRef }, ref) {
    const { accent } = useTheme();
    const categories = useStore((s) => s.categories);
    const activeFilter = useStore((s) => s.ui.activeCategoryFilter);
    const setActiveCategoryFilter = useStore(
      (s) => s.setActiveCategoryFilter,
    );

    return (
      <ScrollView
        ref={ref}
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.row}
      >
        <Chip
          label="Filters"
          icon="filter"
          iconColor={accent.base}
          onPress={() => filterSheetRef.current?.open()}
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
  },
);

const styles = StyleSheet.create({
  row: {
    gap: 6,
    paddingHorizontal: 4,
    paddingVertical: 4,
  },
});
