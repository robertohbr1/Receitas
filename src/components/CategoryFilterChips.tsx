import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  AVAILABLE_CULINARY_CATEGORIES,
  GastronomicColorPalette,
  resolveCategoryIcon,
} from '../theme/gastronomicTheme';
import { CulinaryCategory } from '../types/recipeTypes';

export interface CategoryFilterChipsProps {
  readonly palette: GastronomicColorPalette;
  readonly selectedCategory: CulinaryCategory;
  readonly onSelectCategory: (category: CulinaryCategory) => void;
}

/**
 * Barra horizontal deslizante com pílulas de filtro para cada categoria gastronômica.
 *
 * @example
 * <CategoryFilterChips palette={palette} selectedCategory="Todas" onSelectCategory={setCategory} />
 */
export function CategoryFilterChips(props: CategoryFilterChipsProps): React.ReactElement {
  return (
    <View style={styles.wrapper}>
      <ScrollView
        horizontal
        showsHorizontalScrollIndicator={false}
        contentContainerStyle={styles.scrollContainer}
      >
        {AVAILABLE_CULINARY_CATEGORIES.map((category) => (
          <SingleCategoryChip
            key={category}
            category={category}
            isSelected={props.selectedCategory === category}
            palette={props.palette}
            onPress={() => props.onSelectCategory(category)}
          />
        ))}
      </ScrollView>
    </View>
  );
}

function SingleCategoryChip(props: {
  readonly category: CulinaryCategory;
  readonly isSelected: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onPress: () => void;
}): React.ReactElement {
  const { palette, isSelected, category } = props;
  const backgroundColor = isSelected ? palette.accentTerracotta : palette.backgroundCard;
  const textColor = isSelected ? '#FFFFFF' : palette.textPrimary;
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.chip,
        { backgroundColor, borderColor: palette.borderSubtle },
      ]}
    >
      <Text style={[styles.chipText, { color: textColor }]}>
        {resolveCategoryIcon(category)} {category}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  wrapper: { paddingVertical: 6 },
  scrollContainer: { paddingHorizontal: 16, gap: 8 },
  chip: {
    paddingHorizontal: 14,
    paddingVertical: 8,
    borderRadius: 20,
    borderWidth: 1,
  },
  chipText: { fontSize: 13, fontWeight: '600' },
});
