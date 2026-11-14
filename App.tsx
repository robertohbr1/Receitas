import React, { useCallback, useEffect, useMemo, useState } from 'react';
import { AppState, AppStateStatus, SafeAreaView, StatusBar, StyleSheet } from 'react-native';
import { MultiProviderAiTranscriptionGateway } from './src/adapters/aiVideoTranscriptionGateway';
import { ClipboardGateway, ExpoClipboardGateway } from './src/adapters/clipboardGateway';
import {
  BackupDocumentPickerGateway,
  ExpoBackupDocumentPickerGateway,
} from './src/adapters/documentPickerGateway';
import {
  ExpoMediaLibraryPickerGateway,
  MediaLibraryPickerGateway,
} from './src/adapters/mediaPickerGateway';
import { ExpoFileSystemMediaCacheGateway } from './src/adapters/offlineMediaCacheGateway';
import {
  ExpoRecipeExportGateway,
  RecipeExportGateway,
} from './src/adapters/recipeShareGateway';
import {
  extractSupportedRecipeUrlFromSharedText,
  useIncomingShareIntentListener,
} from './src/adapters/shareIntentGateway';
import { AsyncStorageGateway } from './src/adapters/storageGateway';
import {
  isStandaloneSupportedVideoUrl,
  PublicWebYoutubeMetadataGateway,
  YoutubeVideoMetadataGateway,
} from './src/adapters/youtubeMetadataGateway';
import { AiApiKeySettingsModal } from './src/components/AiApiKeySettingsModal';
import {
  RecipeCatalogController,
  useRecipeCatalogController,
} from './src/hooks/useRecipeCatalogController';
import {
  AiSettingsRepository,
  AiTranscriptionApiKeysConfig,
  hasAnyConfiguredAiKey,
} from './src/repositories/aiSettingsRepository';
import { CulinaryRecipeRepository } from './src/repositories/culinaryRecipeRepository';
import { PendingImportQueueRepository } from './src/repositories/pendingImportQueueRepository';
import { CatalogScreen } from './src/screens/CatalogScreen';
import { RecipeDetailScreen } from './src/screens/RecipeDetailScreen';
import { RecipeFormScreen } from './src/screens/RecipeFormScreen';
import {
  GastronomicColorPalette,
  selectGastronomicPalette,
} from './src/theme/gastronomicTheme';
import { CulinaryRecipeRecord } from './src/types/recipeTypes';

export interface AppDependencies {
  readonly repository?: CulinaryRecipeRepository;
  readonly pendingQueueRepository?: PendingImportQueueRepository;
  readonly aiSettingsRepository?: AiSettingsRepository;
  readonly mediaPickerGateway?: MediaLibraryPickerGateway;
  readonly exportGateway?: RecipeExportGateway;
  readonly youtubeGateway?: YoutubeVideoMetadataGateway;
  readonly clipboardGateway?: ClipboardGateway;
  readonly documentPickerGateway?: BackupDocumentPickerGateway;
}

/**
 * Componente raiz do aplicativo mobile Caderno Gastronômico com injeção de dependências.
 *
 * @example
 * <App />
 */
export default function App(props: AppDependencies): React.ReactElement {
  const deps = useResolvedAppDependencies(props);
  const controller = useRecipeCatalogController(deps.repository, deps.pendingQueueRepository);
  const aiModal = useStartupAiKeysController(deps.aiSettingsRepository);
  const clipboardDetector = useClipboardRecipeDetector(
    deps.clipboardGateway,
    controller.allRecipes,
  );
  const handleSharedUrl = useCallback(
    (sharedUrl: string) => {
      void controller.quickImportRecipeFromUrl(sharedUrl, deps.youtubeGateway);
    },
    [controller.quickImportRecipeFromUrl, deps.youtubeGateway],
  );
  useIncomingShareIntentListener(handleSharedUrl);
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
        deps={deps}
        detectedClipboardUrl={clipboardDetector.detectedUrl}
        onDismissClipboardUrl={clipboardDetector.dismissDetectedUrl}
        onPasteClipboardNow={() =>
          void executePasteClipboardImport(
            deps.clipboardGateway,
            deps.youtubeGateway,
            controller,
            clipboardDetector.dismissDetectedUrl,
          )
        }
        onOpenAiSettings={aiModal.openSettingsManually}
      />
      <AiApiKeySettingsModal
        visible={aiModal.isVisible}
        isInitialPrompt={aiModal.isInitialPrompt}
        currentKeys={aiModal.currentKeys}
        palette={palette}
        onSaveKeys={aiModal.saveAndClose}
        onContinueWithoutKeys={aiModal.closeModal}
      />
    </SafeAreaView>
  );
}

interface ResolvedDependenciesBundle {
  readonly repository: CulinaryRecipeRepository;
  readonly pendingQueueRepository: PendingImportQueueRepository;
  readonly aiSettingsRepository: AiSettingsRepository;
  readonly mediaPicker: MediaLibraryPickerGateway;
  readonly exportGateway: RecipeExportGateway;
  readonly youtubeGateway: YoutubeVideoMetadataGateway;
  readonly clipboardGateway: ClipboardGateway;
  readonly documentPickerGateway: BackupDocumentPickerGateway;
}

function useResolvedAppDependencies(props: AppDependencies): ResolvedDependenciesBundle {
  return useMemo(() => {
    const storage = new AsyncStorageGateway();
    const mediaCache = new ExpoFileSystemMediaCacheGateway();
    const aiSettingsRepository = props.aiSettingsRepository ?? new AiSettingsRepository(storage);
    const aiGateway = new MultiProviderAiTranscriptionGateway(aiSettingsRepository);
    return {
      repository: props.repository ?? new CulinaryRecipeRepository(storage, mediaCache),
      pendingQueueRepository:
        props.pendingQueueRepository ?? new PendingImportQueueRepository(storage),
      aiSettingsRepository,
      mediaPicker: props.mediaPickerGateway ?? new ExpoMediaLibraryPickerGateway(),
      exportGateway: props.exportGateway ?? new ExpoRecipeExportGateway(),
      youtubeGateway: props.youtubeGateway ?? new PublicWebYoutubeMetadataGateway(aiGateway),
      clipboardGateway: props.clipboardGateway ?? new ExpoClipboardGateway(),
      documentPickerGateway: props.documentPickerGateway ?? new ExpoBackupDocumentPickerGateway(),
    };
  }, [props]);
}

function useClipboardRecipeDetector(
  clipboardGateway: ClipboardGateway,
  allRecipes: readonly CulinaryRecipeRecord[],
): { readonly detectedUrl: string | null; readonly dismissDetectedUrl: () => void } {
  const [detectedUrl, setDetectedUrl] = useState<string | null>(null);
  const [dismissedUrl, setDismissedUrl] = useState<string | null>(null);

  const checkClipboard = useCallback(async () => {
    const candidate = extractSupportedRecipeUrlFromSharedText(
      await clipboardGateway.readClipboardText(),
    );
    if (!candidate || candidate === dismissedUrl || isUrlAlreadySaved(candidate, allRecipes)) {
      setDetectedUrl(null);
      return;
    }
    setDetectedUrl(candidate);
  }, [clipboardGateway, allRecipes, dismissedUrl]);

  useEffect(() => {
    void checkClipboard();
    const sub = AppState.addEventListener('change', (state: AppStateStatus) => {
      if (state === 'active') void checkClipboard();
    });
    return () => sub.remove();
  }, [checkClipboard]);

  return {
    detectedUrl,
    dismissDetectedUrl: () => {
      setDismissedUrl(detectedUrl);
      setDetectedUrl(null);
    },
  };
}

function isUrlAlreadySaved(url: string, recipes: readonly CulinaryRecipeRecord[]): boolean {
  const normalized = url.trim().toLowerCase();
  return recipes.some(
    (item) =>
      item.videoSourceUri.trim().toLowerCase() === normalized ||
      (item.originalSourceUrl ?? '').trim().toLowerCase() === normalized,
  );
}

async function executePasteClipboardImport(
  clipboardGateway: ClipboardGateway,
  youtubeGateway: YoutubeVideoMetadataGateway,
  controller: RecipeCatalogController,
  dismissDetectedUrl: () => void,
): Promise<void> {
  const raw = await clipboardGateway.readClipboardText();
  const url = extractSupportedRecipeUrlFromSharedText(raw) ?? (isStandaloneSupportedVideoUrl(raw) ? raw.trim() : null);
  if (!url) {
    return;
  }
  dismissDetectedUrl();
  await controller.quickImportRecipeFromUrl(url, youtubeGateway);
}

function useStartupAiKeysController(aiSettingsRepository: AiSettingsRepository): {
  readonly isVisible: boolean;
  readonly isInitialPrompt: boolean;
  readonly currentKeys: AiTranscriptionApiKeysConfig;
  readonly openSettingsManually: () => void;
  readonly closeModal: () => void;
  readonly saveAndClose: (keys: AiTranscriptionApiKeysConfig) => Promise<void>;
} {
  const [currentKeys, setCurrentKeys] = useState<AiTranscriptionApiKeysConfig>({
    geminiApiKey: '',
    groqWhisperApiKey: '',
  });
  const [isVisible, setIsVisible] = useState<boolean>(false);
  const [isInitialPrompt, setIsInitialPrompt] = useState<boolean>(true);
  useEffect(() => {
    void aiSettingsRepository.loadApiKeysConfig().then((loaded) => {
      setCurrentKeys(loaded);
      if (!hasAnyConfiguredAiKey(loaded)) setIsVisible(true);
    });
  }, [aiSettingsRepository]);
  return {
    isVisible,
    isInitialPrompt,
    currentKeys,
    openSettingsManually: () => {
      setIsInitialPrompt(false);
      setIsVisible(true);
    },
    closeModal: () => setIsVisible(false),
    saveAndClose: async (keys) => {
      const saved = await aiSettingsRepository.saveApiKeysConfig(keys);
      setCurrentKeys(saved);
      setIsVisible(false);
    },
  };
}

function ActiveScreenRouter(props: {
  readonly controller: RecipeCatalogController;
  readonly palette: GastronomicColorPalette;
  readonly deps: ResolvedDependenciesBundle;
  readonly detectedClipboardUrl: string | null;
  readonly onDismissClipboardUrl: () => void;
  readonly onPasteClipboardNow: () => void;
  readonly onOpenAiSettings: () => void;
}): React.ReactElement {
  const { controller, palette, deps } = props;
  if (controller.activeView.kind === 'form') {
    return (
      <RecipeFormScreen
        initialRecipe={controller.activeView.editingRecipe}
        palette={palette}
        mediaPickerGateway={deps.mediaPicker}
        youtubeGateway={deps.youtubeGateway}
        clipboardGateway={deps.clipboardGateway}
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
        exportGateway={deps.exportGateway}
        clipboardGateway={deps.clipboardGateway}
        onBackToCatalog={() => controller.setActiveView({ kind: 'catalog' })}
        onEditRecipe={(rec) => controller.setActiveView({ kind: 'form', editingRecipe: rec })}
        onDeleteRecipe={(id) => void controller.deleteRecipeById(id)}
        onToggleFavorite={(id) => void controller.toggleFavoriteById(id)}
        onSaveOfflineVideo={(id) => controller.saveOfflineVideoForRecipe(id)}
        onReconstructFromTranscript={(id, text) =>
          controller.reconstructRecipeFromSavedTranscript(id, text)
        }
      />
    );
  }
  return (
    <CatalogViewConnector
      controller={controller}
      palette={palette}
      deps={deps}
      detectedClipboardUrl={props.detectedClipboardUrl}
      onDismissClipboardUrl={props.onDismissClipboardUrl}
      onPasteClipboardNow={props.onPasteClipboardNow}
      onOpenAiSettings={props.onOpenAiSettings}
    />
  );
}

function CatalogViewConnector(props: {
  readonly controller: RecipeCatalogController;
  readonly palette: GastronomicColorPalette;
  readonly deps: ResolvedDependenciesBundle;
  readonly detectedClipboardUrl: string | null;
  readonly onDismissClipboardUrl: () => void;
  readonly onPasteClipboardNow: () => void;
  readonly onOpenAiSettings: () => void;
}): React.ReactElement {
  const { controller, palette, deps } = props;
  return (
    <CatalogScreen
      recipes={controller.filteredRecipes}
      totalRecipesCount={controller.allRecipes.length}
      filterCriteria={controller.filterCriteria}
      palette={palette}
      isDarkMode={controller.isDarkMode}
      detectedClipboardUrl={props.detectedClipboardUrl}
      isQuickImporting={controller.isQuickImporting}
      importStatusMessage={controller.importStatusMessage}
      pendingImports={controller.pendingImports}
      retryingPendingId={controller.retryingPendingId}
      onUpdateSearchQuery={controller.updateSearchQuery}
      onSelectCategory={controller.selectCategory}
      onToggleFavoritesOnly={controller.toggleFavoritesOnly}
      onToggleFastFilter={controller.toggleFastRecipesFilter}
      onToggleFewIngredientsFilter={controller.toggleFewIngredientsFilter}
      onCycleSortOrder={controller.cycleSortOrder}
      onToggleDarkMode={controller.toggleDarkMode}
      onOpenRecipeDetail={(rec) => controller.setActiveView({ kind: 'detail', recipeId: rec.id })}
      onOpenCreateForm={() => controller.setActiveView({ kind: 'form', editingRecipe: null })}
      onToggleRecipeFavorite={(id) => void controller.toggleFavoriteById(id)}
      onQuickSaveDetectedUrl={() => {
        if (!props.detectedClipboardUrl) return;
        const targetUrl = props.detectedClipboardUrl;
        props.onDismissClipboardUrl();
        void controller.quickImportRecipeFromUrl(targetUrl, deps.youtubeGateway);
      }}
      onPasteClipboardNow={props.onPasteClipboardNow}
      onDismissClipboardBanner={props.onDismissClipboardUrl}
      onRetryPendingImport={(item) =>
        void controller.retryPendingImportItem(item, deps.youtubeGateway)
      }
      onRemovePendingImport={(id) => void controller.dismissPendingImportById(id)}
      onGenerateBackupJson={controller.exportCatalogBackup}
      onRestoreBackupJson={controller.importCatalogBackup}
      onGenerateBackupZipBase64={controller.exportCatalogZipBackup}
      onRestoreBackupZipBase64={controller.importCatalogZipBackup}
      documentPickerGateway={deps.documentPickerGateway}
      clipboardGateway={deps.clipboardGateway}
      onOpenAiSettings={props.onOpenAiSettings}
    />
  );
}

const styles = StyleSheet.create({
  safeRoot: { flex: 1 },
});
