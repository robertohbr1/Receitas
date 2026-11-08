import React from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { CatalogHeaderBar } from '../components/CatalogHeaderBar';
import { CategoryFilterChips } from '../components/CategoryFilterChips';
import { RecipeCatalogCard } from '../components/RecipeCatalogCard';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';
import {
  CatalogFilterCriteria,
  CulinaryCategory,
  CulinaryRecipeRecord,
} from '../types/recipeTypes';

export interface CatalogScreenProps {
  readonly recipes: readonly CulinaryRecipeRecord[];
  readonly totalRecipesCount: number;
  readonly filterCriteria: CatalogFilterCriteria;
  readonly palette: GastronomicColorPalette;
  readonly isDarkMode: boolean;
  readonly onUpdateSearchQuery: (query: string) => void;
  readonly onSelectCategory: (category: CulinaryCategory) => void;
  readonly onToggleFavoritesOnly: () => void;
  readonly onToggleDarkMode: () => void;
  readonly onOpenRecipeDetail: (recipe: CulinaryRecipeRecord) => void;
  readonly onOpenCreateForm: () => void;
  readonly onToggleRecipeFavorite: (recipeId: string) => void;
}

/**
 * Tela principal do catálogo com busca instantânea, filtros por categoria e lista de receitas.
 *
 * @example
 * <CatalogScreen recipes={filtered} totalRecipesCount={all.length} filterCriteria={criteria} ... />
 */
export function CatalogScreen(props: CatalogScreenProps): React.ReactElement {
  const { palette, filterCriteria } = props;
  return (
    <View style={[styles.screen, { backgroundColor: palette.backgroundPrimary }]}>
      <CatalogHeaderBar
        palette={palette}
        isDarkMode={props.isDarkMode}
        totalRecipesCount={props.totalRecipesCount}
        searchQuery={filterCriteria.searchQuery}
        onlyFavorites={filterCriteria.onlyFavorites}
        onSearchQueryChange={props.onUpdateSearchQuery}
        onToggleFavoritesFilter={props.onToggleFavoritesOnly}
        onToggleDarkMode={props.onToggleDarkMode}
        onOpenCreateRecipe={props.onOpenCreateForm}
      />
      <CategoryFilterChips
        palette={palette}
        selectedCategory={filterCriteria.selectedCategory}
        onSelectCategory={props.onSelectCategory}
      />
      <CatalogRecipeListBody
        recipes={props.recipes}
        palette={palette}
        onOpenRecipeDetail={props.onOpenRecipeDetail}
        onToggleRecipeFavorite={props.onToggleRecipeFavorite}
        onOpenCreateForm={props.onOpenCreateForm}
      />
    </View>
  );
}

function CatalogRecipeListBody(props: {
  readonly recipes: readonly CulinaryRecipeRecord[];
  readonly palette: GastronomicColorPalette;
  readonly onOpenRecipeDetail: (recipe: CulinaryRecipeRecord) => void;
  readonly onToggleRecipeFavorite: (recipeId: string) => void;
  readonly onOpenCreateForm: () => void;
}): React.ReactElement {
  if (props.recipes.length === 0) {
    return (
      <EmptyCatalogState
        palette={props.palette}
        onOpenCreateForm={props.onOpenCreateForm}
      />
    );
  }
  return (
    <ScrollView contentContainerStyle={styles.listPadding}>
      {props.recipes.map((recipe) => (
        <RecipeCatalogCard
          key={recipe.id}
          recipe={recipe}
          palette={props.palette}
          onSelectRecipe={props.onOpenRecipeDetail}
          onToggleFavorite={props.onToggleRecipeFavorite}
        />
      ))}
    </ScrollView>
  );
}

function EmptyCatalogState(props: {
  readonly palette: GastronomicColorPalette;
  readonly onOpenCreateForm: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.emptyBox}>
      <Text style={styles.emptyEmoji}>🥘</Text>
      <Text style={[styles.emptyTitle, { color: palette.textPrimary }]}>
        Nenhuma receita encontrada
      </Text>
      <Text style={[styles.emptySubtitle, { color: palette.textSecondary }]}>
        Tente mudar os filtros de busca ou cadastre uma nova receita com vídeo e texto.
      </Text>
      <TouchableOpacity
        onPress={props.onOpenCreateForm}
        style={[styles.emptyActionBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.emptyActionText}>+ Adicionar Nova Receita</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  listPadding: { paddingHorizontal: 16, paddingTop: 8, paddingBottom: 32 },
  emptyBox: { flex: 1, justifyContent: 'center', alignItems: 'center', padding: 32 },
  emptyEmoji: { fontSize: 48, marginBottom: 12 },
  emptyTitle: { fontSize: 18, fontWeight: '700', marginBottom: 6, textAlign: 'center' },
  emptySubtitle: { fontSize: 14, textAlign: 'center', lineHeight: 20, marginBottom: 18 },
  emptyActionBtn: { paddingHorizontal: 18, paddingVertical: 12, borderRadius: 12 },
  emptyActionText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
