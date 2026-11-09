import React from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface CatalogHeaderBarProps {
  readonly palette: GastronomicColorPalette;
  readonly isDarkMode: boolean;
  readonly totalRecipesCount: number;
  readonly searchQuery: string;
  readonly onlyFavorites: boolean;
  readonly onSearchQueryChange: (query: string) => void;
  readonly onToggleFavoritesFilter: () => void;
  readonly onToggleDarkMode: () => void;
  readonly onOpenCreateRecipe: () => void;
  readonly onOpenBackupModal?: () => void;
}

/**
 * Cabeçalho principal do catálogo com busca por nome/ingrediente, filtro de favoritas, backup e alternador de tema.
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
      />
      <SearchAndFavoriteRow
        palette={palette}
        searchQuery={props.searchQuery}
        onlyFavorites={props.onlyFavorites}
        onSearchQueryChange={props.onSearchQueryChange}
        onToggleFavoritesFilter={props.onToggleFavoritesFilter}
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
      <View style={styles.actionsRow}>
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
      <TextInput
        value={props.searchQuery}
        onChangeText={props.onSearchQueryChange}
        placeholder="Buscar por prato, ingrediente ou tag..."
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.searchInput,
          {
            backgroundColor: palette.backgroundCard,
            color: palette.textPrimary,
            borderColor: palette.borderSubtle,
          },
        ]}
      />
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

const styles = StyleSheet.create({
  container: { paddingHorizontal: 16, paddingTop: 14, paddingBottom: 8 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
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
  searchInput: { flex: 1, height: 42, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, fontSize: 14 },
  favoriteFilterChip: { height: 42, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, justifyContent: 'center' },
  favoriteFilterText: { fontSize: 13, fontWeight: '600' },
});
