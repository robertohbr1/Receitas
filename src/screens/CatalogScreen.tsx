import React, { useState } from 'react';
import { ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClipboardGateway } from '../adapters/clipboardGateway';
import { BackupDocumentPickerGateway } from '../adapters/documentPickerGateway';
import { BackupTransferModal } from '../components/BackupTransferModal';
import { CatalogHeaderBar } from '../components/CatalogHeaderBar';
import { CategoryFilterChips } from '../components/CategoryFilterChips';
import { ClipboardImportBanner } from '../components/ClipboardImportBanner';
import { PendingImportsCard } from '../components/PendingImportsCard';
import { RecipeCatalogCard } from '../components/RecipeCatalogCard';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';
import {
  CatalogFilterCriteria,
  CulinaryCategory,
  CulinaryRecipeRecord,
  PendingRecipeImportItem,
} from '../types/recipeTypes';

export interface CatalogScreenProps {
  readonly recipes: readonly CulinaryRecipeRecord[];
  readonly totalRecipesCount: number;
  readonly filterCriteria: CatalogFilterCriteria;
  readonly palette: GastronomicColorPalette;
  readonly isDarkMode: boolean;
  readonly detectedClipboardUrl?: string | null;
  readonly isQuickImporting?: boolean;
  readonly importStatusMessage?: string | null;
  readonly pendingImports?: readonly PendingRecipeImportItem[];
  readonly retryingPendingId?: string | null;
  readonly onUpdateSearchQuery: (query: string) => void;
  readonly onSelectCategory: (category: CulinaryCategory) => void;
  readonly onToggleFavoritesOnly: () => void;
  readonly onToggleFastFilter?: () => void;
  readonly onToggleFewIngredientsFilter?: () => void;
  readonly onCycleSortOrder?: () => void;
  readonly onToggleDarkMode: () => void;
  readonly onOpenRecipeDetail: (recipe: CulinaryRecipeRecord) => void;
  readonly onOpenCreateForm: () => void;
  readonly onToggleRecipeFavorite: (recipeId: string) => void;
  readonly onQuickSaveDetectedUrl?: () => void;
  readonly onPasteClipboardNow?: () => void;
  readonly onDismissClipboardBanner?: () => void;
  readonly onRetryPendingImport?: (item: PendingRecipeImportItem) => void;
  readonly onRemovePendingImport?: (pendingId: string) => void;
  readonly onGenerateBackupJson?: () => Promise<string>;
  readonly onRestoreBackupJson?: (rawJson: string) => Promise<number>;
  readonly onGenerateBackupZipBase64?: () => Promise<string>;
  readonly onRestoreBackupZipBase64?: (zipBase64: string) => Promise<number>;
  readonly documentPickerGateway?: BackupDocumentPickerGateway;
  readonly clipboardGateway?: ClipboardGateway;
  readonly onOpenAiSettings?: () => void;
}

/**
 * Tela principal do catálogo com busca, filtros, atalho de área de transferência, links pendentes e backup.
 *
 * @example
 * <CatalogScreen recipes={filtered} totalRecipesCount={all.length} filterCriteria={criteria} ... />
 */
export function CatalogScreen(props: CatalogScreenProps): React.ReactElement {
  const { palette, filterCriteria } = props;
  const [isBackupOpen, setIsBackupOpen] = useState<boolean>(false);
  return (
    <View style={[styles.screen, { backgroundColor: palette.backgroundPrimary }]}>
      <CatalogHeaderBar
        palette={palette}
        isDarkMode={props.isDarkMode}
        totalRecipesCount={props.totalRecipesCount}
        searchQuery={filterCriteria.searchQuery}
        onlyFavorites={filterCriteria.onlyFavorites}
        maxPrepMinutes={filterCriteria.maxPrepMinutes}
        maxIngredientsCount={filterCriteria.maxIngredientsCount}
        sortBy={filterCriteria.sortBy}
        onSearchQueryChange={props.onUpdateSearchQuery}
        onToggleFavoritesFilter={props.onToggleFavoritesOnly}
        onToggleFastFilter={props.onToggleFastFilter}
        onToggleFewIngredientsFilter={props.onToggleFewIngredientsFilter}
        onCycleSortOrder={props.onCycleSortOrder}
        onToggleDarkMode={props.onToggleDarkMode}
        onOpenCreateRecipe={props.onOpenCreateForm}
        onOpenBackupModal={() => setIsBackupOpen(true)}
        onOpenAiSettings={props.onOpenAiSettings}
      />
      <CategoryFilterChips
        palette={palette}
        selectedCategory={filterCriteria.selectedCategory}
        onSelectCategory={props.onSelectCategory}
      />
      {props.onQuickSaveDetectedUrl && props.onPasteClipboardNow && props.onDismissClipboardBanner && (
        <ClipboardImportBanner
          palette={palette}
          detectedUrl={props.detectedClipboardUrl ?? null}
          isImporting={Boolean(props.isQuickImporting)}
          statusMessage={props.importStatusMessage ?? null}
          onQuickSaveDetectedUrl={props.onQuickSaveDetectedUrl}
          onPasteFromClipboardNow={props.onPasteClipboardNow}
          onDismissBanner={props.onDismissClipboardBanner}
        />
      )}
      {props.pendingImports && props.onRetryPendingImport && props.onRemovePendingImport && (
        <PendingImportsCard
          palette={palette}
          pendingItems={props.pendingImports}
          retryingItemId={props.retryingPendingId ?? null}
          onRetryPendingItem={props.onRetryPendingImport}
          onRemovePendingItem={props.onRemovePendingImport}
        />
      )}
      <CatalogRecipeListBody
        recipes={props.recipes}
        palette={palette}
        onOpenRecipeDetail={props.onOpenRecipeDetail}
        onToggleRecipeFavorite={props.onToggleRecipeFavorite}
        onOpenCreateForm={props.onOpenCreateForm}
      />
      {props.onGenerateBackupJson && props.onRestoreBackupJson && (
        <BackupTransferModal
          visible={isBackupOpen}
          palette={palette}
          onClose={() => setIsBackupOpen(false)}
          onGenerateBackupJson={props.onGenerateBackupJson}
          onRestoreBackupJson={props.onRestoreBackupJson}
          onGenerateBackupZipBase64={props.onGenerateBackupZipBase64}
          onRestoreBackupZipBase64={props.onRestoreBackupZipBase64}
          documentPickerGateway={props.documentPickerGateway}
          clipboardGateway={props.clipboardGateway}
        />
      )}
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