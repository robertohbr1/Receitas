import React, { useMemo } from 'react';
import { SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import {
  ExpoMediaLibraryPickerGateway,
  MediaLibraryPickerGateway,
} from './src/adapters/mediaPickerGateway';
import {
  ExpoRecipeExportGateway,
  RecipeExportGateway,
} from './src/adapters/recipeShareGateway';
import { AsyncStorageGateway } from './src/adapters/storageGateway';
import {
  PublicWebYoutubeMetadataGateway,
  YoutubeVideoMetadataGateway,
} from './src/adapters/youtubeMetadataGateway';
import {
  RecipeCatalogController,
  useRecipeCatalogController,
} from './src/hooks/useRecipeCatalogController';
import { CulinaryRecipeRepository } from './src/repositories/culinaryRecipeRepository';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { RecipeFormScreen } from './src/screens/RecipeFormScreen';
import {
  GastronomicColorPalette,
  selectGastronomicPalette,
} from './src/theme/gastronomicTheme';

export interface AppDependencies {
  readonly repository?: CulinaryRecipeRepository;
  readonly mediaPickerGateway?: MediaLibraryPickerGateway;
  readonly exportGateway?: RecipeExportGateway;
  readonly youtubeGateway?: YoutubeVideoMetadataGateway;
}

/**
 * Componente raiz do aplicativo mobile Caderno Gastronômico com injeção de dependências.
 *
 * @example
 * <App />
 */
export default function App(props: AppDependencies): React.ReactElement {
  const repository = useMemo(
    () => props.repository ?? new CulinaryRecipeRepository(new AsyncStorageGateway()),
    [props.repository],
  );
  const mediaPicker = useMemo(
    () => props.mediaPickerGateway ?? new ExpoMediaLibraryPickerGateway(),
    [props.mediaPickerGateway],
  );
  const exportGateway = useMemo(
    () => props.exportGateway ?? new ExpoRecipeExportGateway(),
    [props.exportGateway],
  );
  const youtubeGateway = useMemo(
    () => props.youtubeGateway ?? new PublicWebYoutubeMetadataGateway(),
    [props.youtubeGateway],
  );
  const controller = useRecipeCatalogController(repository);
  const palette = selectGastronomicPalette(controller.isDarkMode);

  return (
    <SafeAreaView style={[styles.safeRoot, { backgroundColor: palette.backgroundPrimary }]}>
      <StatusBar
        barStyle={controller.isDarkMode ? 'light-content' : 'dark-content'}
        backgroundColor={palette.backgroundPrimary}
      />
      <ActiveScreenRouter
        controller={controller}
        palette={palette}
        mediaPicker={mediaPicker}
        exportGateway={exportGateway}
        youtubeGateway={youtubeGateway}
      />
    </SafeAreaView>
  );
}

function ActiveScreenRouter(props: {
  readonly controller: RecipeCatalogController;
  readonly palette: GastronomicColorPalette;
  readonly mediaPicker: MediaLibraryPickerGateway;
  readonly exportGateway: RecipeExportGateway;
  readonly youtubeGateway: YoutubeVideoMetadataGateway;
}): React.ReactElement {
  const { controller, palette } = props;
  if (controller.activeView.kind === 'form') {
    return (
      <RecipeFormScreen
        initialRecipe={controller.activeView.editingRecipe}
        palette={palette}
        mediaPickerGateway={props.mediaPicker}
        youtubeGateway={props.youtubeGateway}
        onCancel={() => controller.setActiveView({ kind: 'catalog' })}
        onSaveRecipeDraft={controller.saveRecipeDraft}
      />
    );
  }
  const activeDetailId =
    controller.activeView.kind === 'detail' ? controller.activeView.recipeId : null;
  const detailRecipe = activeDetailId
    ? controller.allRecipes.find((item) => item.id === activeDetailId) ?? null
    : null;
  if (detailRecipe) {
    return (
      <RecipeDetailScreen
        recipe={detailRecipe}
        palette={palette}
        exportGateway={props.exportGateway}
        onBackToCatalog={() => controller.setActiveView({ kind: 'catalog' })}
        onEditRecipe={(rec) => controller.setActiveView({ kind: 'form', editingRecipe: rec })}
        onDeleteRecipe={(id) => void controller.deleteRecipeById(id)}
        onToggleFavorite={(id) => void controller.toggleFavoriteById(id)}
      />
    );
  }
  return <CatalogViewConnector controller={controller} palette={palette} />;
}

function CatalogViewConnector(props: {
  readonly controller: RecipeCatalogController;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { controller, palette } = props;
  return (
    <CatalogScreen
      recipes={controller.filteredRecipes}
      totalRecipesCount={controller.allRecipes.length}
      filterCriteria={controller.filterCriteria}
      palette={palette}
      isDarkMode={controller.isDarkMode}
      onUpdateSearchQuery={controller.updateSearchQuery}
      onSelectCategory={controller.selectCategory}
      onToggleFavoritesOnly={controller.toggleFavoritesOnly}
      onToggleDarkMode={controller.toggleDarkMode}
      onOpenRecipeDetail={(rec) => controller.setActiveView({ kind: 'detail', recipeId: rec.id })}
      onOpenCreateForm={() => controller.setActiveView({ kind: 'form', editingRecipe: null })}
      onToggleRecipeFavorite={(id) => void controller.toggleFavoriteById(id)}
      onGenerateBackupJson={controller.exportCatalogBackup}
      onRestoreBackupJson={controller.importCatalogBackup}
    />
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1 },
});
