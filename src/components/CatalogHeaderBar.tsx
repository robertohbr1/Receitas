import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';
import { CatalogSortOrder } from '../types/recipeTypes';

export interface CatalogHeaderBarProps {
  readonly palette: GastronomicColorPalette;
  readonly isDarkMode: boolean;
  readonly totalRecipesCount: number;
  readonly searchQuery: string;
  readonly onlyFavorites: boolean;
  readonly maxPrepMinutes?: number | null;
  readonly maxIngredientsCount?: number | null;
  readonly sortBy?: CatalogSortOrder;
  readonly onSearchQueryChange: (query: string) => void;
  readonly onToggleFavoritesFilter: () => void;
  readonly onToggleFastFilter?: () => void;
  readonly onToggleFewIngredientsFilter?: () => void;
  readonly onCycleSortOrder?: () => void;
  readonly onToggleDarkMode: () => void;
  readonly onOpenCreateRecipe: () => void;
  readonly onOpenBackupModal?: () => void;
  readonly onOpenAiSettings?: () => void;
}

/**
 * Cabeçalho principal do catálogo com busca inteligente multi-termos, filtros rápidos,
 * ordenação, backup e alternador de tema.
 *
 * @example
 * <CatalogHeaderBar palette={palette} isDarkMode={false} totalRecipesCount={5} ... />
 */
export function CatalogHeaderBar(props: CatalogHeaderBarProps): React.ReactElement {
  const { palette } = props;
  return (
    <View style={[styles.container, { backgroundColor: palette.backgroundPrimary }]}>
      <HeaderTitleRow
        palette={palette}
        isDarkMode={props.isDarkMode}
        totalRecipesCount={props.totalRecipesCount}
        onToggleDarkMode={props.onToggleDarkMode}
        onOpenCreateRecipe={props.onOpenCreateRecipe}
        onOpenBackupModal={props.onOpenBackupModal}
        onOpenAiSettings={props.onOpenAiSettings}
      />
      <SearchAndFavoriteRow
        palette={palette}
        searchQuery={props.searchQuery}
        onlyFavorites={props.onlyFavorites}
        onSearchQueryChange={props.onSearchQueryChange}
        onToggleFavoritesFilter={props.onToggleFavoritesFilter}
      />
      <QuickUtilityFiltersRow
        palette={palette}
        isFastActive={props.maxPrepMinutes === 30}
        isFewIngredientsActive={props.maxIngredientsCount === 6}
        sortBy={props.sortBy ?? 'recent'}
        onToggleFastFilter={props.onToggleFastFilter}
        onToggleFewIngredientsFilter={props.onToggleFewIngredientsFilter}
        onCycleSortOrder={props.onCycleSortOrder}
      />
    </View>
  );
}

function HeaderTitleRow(props: {
  readonly palette: GastronomicColorPalette;
  readonly isDarkMode: boolean;
  readonly totalRecipesCount: number;
  readonly onToggleDarkMode: () => void;
  readonly onOpenCreateRecipe: () => void;
  readonly onOpenBackupModal?: () => void;
  readonly onOpenAiSettings?: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.topRow}>
      <View style={styles.titleColumn}>
        <Text style={[styles.appTitle, { color: palette.textPrimary }]}>
          🍲 Caderno Gastronômico
        </Text>
        <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
          {props.totalRecipesCount} receitas salvas no aparelho
        </Text>
      </View>
      <HeaderActionButtons {...props} />
    </View>
  );
}

function HeaderActionButtons(props: {
  readonly palette: GastronomicColorPalette;
  readonly isDarkMode: boolean;
  readonly onToggleDarkMode: () => void;
  readonly onOpenCreateRecipe: () => void;
  readonly onOpenBackupModal?: () => void;
  readonly onOpenAiSettings?: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.actionsRow}>
      {props.onOpenAiSettings && (
        <TouchableOpacity
          onPress={props.onOpenAiSettings}
          style={[styles.themeButton, { backgroundColor: palette.backgroundElevated }]}
        >
          <Text style={[styles.backupBtnText, { color: palette.textPrimary }]}>⚙️ Config.</Text>
        </TouchableOpacity>
      )}
      {props.onOpenBackupModal && (
        <TouchableOpacity
          onPress={props.onOpenBackupModal}
          style={[styles.themeButton, { backgroundColor: palette.backgroundElevated }]}
        >
          <Text style={[styles.backupBtnText, { color: palette.textPrimary }]}>🔄 Backup</Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={props.onToggleDarkMode}
        style={[styles.themeButton, { backgroundColor: palette.backgroundElevated }]}
      >
        <Text style={styles.themeIcon}>{props.isDarkMode ? '☀️' : '🌙'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={props.onOpenCreateRecipe}
        style={[styles.newRecipeButton, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.newRecipeButtonText}>+ Receita</Text>
      </TouchableOpacity>
    </View>
  );
}

function SearchAndFavoriteRow(props: {
  readonly palette: GastronomicColorPalette;
  readonly searchQuery: string;
  readonly onlyFavorites: boolean;
  readonly onSearchQueryChange: (query: string) => void;
  readonly onToggleFavoritesFilter: () => void;
}): React.ReactElement {
  const { palette, onlyFavorites } = props;
  const favBg = onlyFavorites ? palette.accentTerracotta : palette.backgroundCard;
  const favText = onlyFavorites ? '#FFFFFF' : palette.textPrimary;
  return (
    <View style={styles.searchRow}>
      <View
        style={[
          styles.searchInputWrapper,
          { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
        ]}
      >
        <TextInput
          value={props.searchQuery}
          onChangeText={props.onSearchQueryChange}
          placeholder="Buscar prato, ingredientes (ex: frango batata) ou passo..."
          placeholderTextColor={palette.textSecondary}
          style={[styles.searchInput, { color: palette.textPrimary }]}
        />
        {props.searchQuery.trim().length > 0 && (
          <TouchableOpacity
            onPress={() => props.onSearchQueryChange('')}
            style={styles.clearSearchBtn}
          >
            <Text style={[styles.clearSearchText, { color: palette.textSecondary }]}>✕</Text>
          </TouchableOpacity>
        )}
      </View>
      <TouchableOpacity
        onPress={props.onToggleFavoritesFilter}
        style={[
          styles.favoriteFilterChip,
          { backgroundColor: favBg, borderColor: palette.borderSubtle },
        ]}
      >
        <Text style={[styles.favoriteFilterText, { color: favText }]}>
          {onlyFavorites ? '❤️ Favoritas' : '🤍 Favoritas'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function QuickUtilityFiltersRow(props: {
  readonly palette: GastronomicColorPalette;
  readonly isFastActive: boolean;
  readonly isFewIngredientsActive: boolean;
  readonly sortBy: CatalogSortOrder;
  readonly onToggleFastFilter?: () => void;
  readonly onToggleFewIngredientsFilter?: () => void;
  readonly onCycleSortOrder?: () => void;
}): React.ReactElement | null {
  if (!props.onToggleFastFilter && !props.onToggleFewIngredientsFilter && !props.onCycleSortOrder) {
    return null;
  }
  const { palette } = props;
  return (
    <View style={styles.quickFiltersRow}>
      {props.onToggleFastFilter && (
        <UtilityFilterChip
          label="⚡ Até 30 min"
          isActive={props.isFastActive}
          palette={palette}
          onPress={props.onToggleFastFilter}
        />
      )}
      {props.onToggleFewIngredientsFilter && (
        <UtilityFilterChip
          label="🛒 ≤ 6 ingr."
          isActive={props.isFewIngredientsActive}
          palette={palette}
          onPress={props.onToggleFewIngredientsFilter}
        />
      )}
      {props.onCycleSortOrder && (
        <UtilityFilterChip
          label={`🔃 ${formatSortOrderLabel(props.sortBy)}`}
          isActive={props.sortBy !== 'recent'}
          palette={palette}
          onPress={props.onCycleSortOrder}
        />
      )}
    </View>
  );
}

function UtilityFilterChip(props: {
  readonly label: string;
  readonly isActive: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onPress: () => void;
}): React.ReactElement {
  const { palette, isActive } = props;
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.utilityChip,
        {
          backgroundColor: isActive ? palette.accentTerracotta : palette.backgroundElevated,
          borderColor: palette.borderSubtle,
        },
      ]}
    >
      <Text style={[styles.utilityChipText, { color: isActive ? '#FFFFFF' : palette.textPrimary }]}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

function formatSortOrderLabel(sortBy: CatalogSortOrder): string {
  if (sortBy === 'fastest') return 'Mais Rápidas';
  if (sortBy === 'fewest_ingredients') return 'Menos Ingr.';
  return 'Recentes';
}

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 6 },
  topRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
  },
  titleColumn: { flex: 1 },
  appTitle: { fontSize: 22, fontWeight: '800', letterSpacing: 0.2 },
  subtitle: { fontSize: 13, marginTop: 2 },
  actionsRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  themeButton: { paddingVertical: 8, paddingHorizontal: 10, borderRadius: 10 },
  backupBtnText: { fontSize: 12, fontWeight: '700' },
  themeIcon: { fontSize: 16 },
  newRecipeButton: { paddingVertical: 9, paddingHorizontal: 14, borderRadius: 10 },
  newRecipeButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  searchRow: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  searchInputWrapper: {
    flex: 1,
    height: 42,
    borderWidth: 1,
    borderRadius: 10,
    flexDirection: 'row',
    alignItems: 'center',
    paddingHorizontal: 12,
  },
  searchInput: { flex: 1, fontSize: 14, height: '100%' },
  clearSearchBtn: { paddingLeft: 8, paddingVertical: 4 },
  clearSearchText: { fontSize: 14, fontWeight: '800' },
  favoriteFilterChip: {
    height: 42,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    justifyContent: 'center',
  },
  favoriteFilterText: { fontSize: 13, fontWeight: '600' },
  quickFiltersRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginTop: 8 },
  utilityChip: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8, borderWidth: 1 },
  utilityChipText: { fontSize: 11, fontWeight: '700' },
});