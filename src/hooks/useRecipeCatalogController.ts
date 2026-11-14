import { useEffect, useMemo, useState } from 'react';
import {
  resolveSocialRecipeDraftFromUrl,
  YoutubeVideoMetadataGateway,
} from '../adapters/youtubeMetadataGateway';
import {
  CulinaryRecipeRepository,
  filterCatalogRecipes,
} from '../repositories/culinaryRecipeRepository';
import { PendingImportQueueRepository } from '../repositories/pendingImportQueueRepository';
import {
  hasPlaceholderRecipeContent,
  reconstructRecipeFromTranscript,
} from '../services/recipeTranscriptParser';
import {
  CatalogFilterCriteria,
  CatalogSortOrder,
  CulinaryCategory,
  CulinaryRecipeRecord,
  PendingRecipeImportItem,
  RecipeDraftInput,
} from '../types/recipeTypes';

export type ActiveNavigationView =
  | { readonly kind: 'catalog' }
  | { readonly kind: 'detail'; readonly recipeId: string }
  | { readonly kind: 'form'; readonly editingRecipe: CulinaryRecipeRecord | null };

export interface RecipeCatalogController {
  readonly allRecipes: readonly CulinaryRecipeRecord[];
  readonly filteredRecipes: readonly CulinaryRecipeRecord[];
  readonly pendingImports: readonly PendingRecipeImportItem[];
  readonly filterCriteria: CatalogFilterCriteria;
  readonly isDarkMode: boolean;
  readonly activeView: ActiveNavigationView;
  readonly isQuickImporting: boolean;
  readonly retryingPendingId: string | null;
  readonly importStatusMessage: string | null;
  readonly setActiveView: (view: ActiveNavigationView) => void;
  readonly toggleDarkMode: () => void;
  readonly updateSearchQuery: (query: string) => void;
  readonly selectCategory: (category: CulinaryCategory) => void;
  readonly toggleFavoritesOnly: () => void;
  readonly toggleFastRecipesFilter: () => void;
  readonly toggleFewIngredientsFilter: () => void;
  readonly cycleSortOrder: () => void;
  readonly toggleFavoriteById: (recipeId: string) => Promise<void>;
  readonly saveRecipeDraft: (draft: RecipeDraftInput) => Promise<void>;
  readonly deleteRecipeById: (recipeId: string) => Promise<void>;
  readonly saveOfflineVideoForRecipe: (recipeId: string) => Promise<void>;
  readonly reconstructRecipeFromSavedTranscript: (
    recipeId: string,
    transcriptText: string,
  ) => Promise<void>;
  readonly exportCatalogBackup: () => Promise<string>;
  readonly importCatalogBackup: (rawBackupJson: string) => Promise<number>;
  readonly exportCatalogZipBackup: () => Promise<string>;
  readonly importCatalogZipBackup: (zipBase64: string) => Promise<number>;
  readonly quickImportRecipeFromUrl: (
    url: string,
    youtubeGateway: YoutubeVideoMetadataGateway,
  ) => Promise<CulinaryRecipeRecord | null>;
  readonly retryPendingImportItem: (
    item: PendingRecipeImportItem,
    youtubeGateway: YoutubeVideoMetadataGateway,
  ) => Promise<void>;
  readonly dismissPendingImportById: (pendingId: string) => Promise<void>;
  readonly clearImportStatusMessage: () => void;
}

/**
 * Gerencia o estado global de navegação, filtros, fila offline e CRUD no repositório de receitas.
 *
 * @example
 * const controller = useRecipeCatalogController(repository, pendingQueueRepository);
 */
export function useRecipeCatalogController(
  repository: CulinaryRecipeRepository,
  pendingQueueRepository?: PendingImportQueueRepository,
): RecipeCatalogController {
  const [allRecipes, setAllRecipes] = useState<CulinaryRecipeRecord[]>([]);
  const [pendingImports, setPendingImports] = useState<PendingRecipeImportItem[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<ActiveNavigationView>({ kind: 'catalog' });
  const [isQuickImporting, setIsQuickImporting] = useState<boolean>(false);
  const [retryingPendingId, setRetryingPendingId] = useState<string | null>(null);
  const [importStatusMessage, setImportStatusMessage] = useState<string | null>(null);
  const [filterCriteria, setFilterCriteria] = useState<CatalogFilterCriteria>({
    searchQuery: '',
    selectedCategory: 'Todas',
    onlyFavorites: false,
  });

  useEffect(() => {
    void repository.loadAllRecipes().then(setAllRecipes);
    if (pendingQueueRepository) {
      void pendingQueueRepository.loadPendingImports().then(setPendingImports);
    }
  }, [repository, pendingQueueRepository]);

  const filteredRecipes = useMemo(
    () => filterCatalogRecipes(allRecipes, filterCriteria),
    [allRecipes, filterCriteria],
  );

  return {
    allRecipes,
    filteredRecipes,
    pendingImports,
    filterCriteria,
    isDarkMode,
    activeView,
    isQuickImporting,
    retryingPendingId,
    importStatusMessage,
    setActiveView,
    toggleDarkMode: () => setIsDarkMode((prev) => !prev),
    updateSearchQuery: (q) => setFilterCriteria((c) => ({ ...c, searchQuery: q })),
    selectCategory: (cat) => setFilterCriteria((c) => ({ ...c, selectedCategory: cat })),
    toggleFavoritesOnly: () => setFilterCriteria((c) => ({ ...c, onlyFavorites: !c.onlyFavorites })),
    toggleFastRecipesFilter: () =>
      setFilterCriteria((c) => ({
        ...c,
        maxPrepMinutes: c.maxPrepMinutes === 30 ? null : 30,
      })),
    toggleFewIngredientsFilter: () =>
      setFilterCriteria((c) => ({
        ...c,
        maxIngredientsCount: c.maxIngredientsCount === 6 ? null : 6,
      })),
    cycleSortOrder: () =>
      setFilterCriteria((c) => ({ ...c, sortBy: resolveNextSortOrder(c.sortBy) })),
    toggleFavoriteById: (id) => executeToggleFavorite(repository, id, setAllRecipes),
    saveRecipeDraft: (draft) =>
      executeSaveDraft(repository, activeView, draft, setAllRecipes, setActiveView),
    deleteRecipeById: (id) => executeDeleteRecipe(repository, id, setAllRecipes, setActiveView),
    saveOfflineVideoForRecipe: (id) => executeSaveOfflineVideo(repository, id, setAllRecipes),
    reconstructRecipeFromSavedTranscript: (id, text) =>
      executeReconstructFromTranscript(repository, id, text, setAllRecipes),
    exportCatalogBackup: () => repository.exportCatalogBackupJson(),
    importCatalogBackup: async (rawBackupJson) => {
      const merged = await repository.importCatalogBackupJson(rawBackupJson);
      setAllRecipes(merged);
      return merged.length;
    },
    exportCatalogZipBackup: () => repository.exportCatalogZipBase64(),
    importCatalogZipBackup: async (zipBase64) => {
      const merged = await repository.importCatalogZipBase64(zipBase64);
      setAllRecipes(merged);
      return merged.length;
    },
    quickImportRecipeFromUrl: (url, gateway) =>
      executeQuickImportFromUrl(
        url,
        gateway,
        repository,
        pendingQueueRepository,
        setIsQuickImporting,
        setImportStatusMessage,
        setAllRecipes,
        setPendingImports,
        setActiveView,
      ),
    retryPendingImportItem: (item, gateway) =>
      executeRetryPendingItem(
        item,
        gateway,
        repository,
        pendingQueueRepository,
        setRetryingPendingId,
        setImportStatusMessage,
        setAllRecipes,
        setPendingImports,
        setActiveView,
      ),
    dismissPendingImportById: async (pendingId) => {
      if (!pendingQueueRepository) return;
      setPendingImports(await pendingQueueRepository.removePendingImportById(pendingId));
    },
    clearImportStatusMessage: () => setImportStatusMessage(null),
  };
}

function resolveNextSortOrder(current?: CatalogSortOrder): CatalogSortOrder {
  if (!current || current === 'recent') return 'fastest';
  if (current === 'fastest') return 'fewest_ingredients';
  return 'recent';
}

async function executeReconstructFromTranscript(
  repository: CulinaryRecipeRepository,
  recipeId: string,
  transcriptText: string,
  setAllRecipes: (items: CulinaryRecipeRecord[]) => void,
): Promise<void> {
  const existing = (await repository.loadAllRecipes()).find((item) => item.id === recipeId);
  if (!existing) return;
  const rebuilt = reconstructRecipeFromTranscript(transcriptText, existing.title);
  const keepIngredients =
    !hasPlaceholderRecipeContent(existing.ingredients, ['ok']) && existing.ingredients.length > 1;
  await repository.updateExistingRecipe(recipeId, {
    ...existing,
    ingredients: keepIngredients ? existing.ingredients : rebuilt.extractedIngredients,
    preparationSteps: rebuilt.extractedSteps,
    videoTranscriptText: transcriptText,
  });
  setAllRecipes(await repository.loadAllRecipes());
}

async function executeSaveOfflineVideo(
  repository: CulinaryRecipeRepository,
  recipeId: string,
  setAllRecipes: (items: CulinaryRecipeRecord[]) => void,
): Promise<void> {
  await repository.saveOfflineVideoForRecipe(recipeId);
  setAllRecipes(await repository.loadAllRecipes());
}

async function executeQuickImportFromUrl(
  url: string,
  youtubeGateway: YoutubeVideoMetadataGateway,
  repository: CulinaryRecipeRepository,
  pendingQueueRepository: PendingImportQueueRepository | undefined,
  setIsQuickImporting: (loading: boolean) => void,
  setImportStatusMessage: (msg: string | null) => void,
  setAllRecipes: (items: CulinaryRecipeRecord[]) => void,
  setPendingImports: (items: PendingRecipeImportItem[]) => void,
  setActiveView: (view: ActiveNavigationView) => void,
): Promise<CulinaryRecipeRecord | null> {
  setIsQuickImporting(true);
  setImportStatusMessage(null);
  try {
    const draft = await resolveSocialRecipeDraftFromUrl(url, youtubeGateway);
    const saved = await repository.createRecipe(draft);
    setAllRecipes(await repository.loadAllRecipes());
    setActiveView({ kind: 'detail', recipeId: saved.id });
    return saved;
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Falha na importação';
    if (pendingQueueRepository) {
      setPendingImports(await pendingQueueRepository.enqueuePendingUrl(url, reason));
      setImportStatusMessage('⏳ Sem conexão ou link bloqueado: salvo em Links Pendentes!');
    } else {
      setImportStatusMessage(reason);
    }
    return null;
  } finally {
    setIsQuickImporting(false);
  }
}

async function executeRetryPendingItem(
  item: PendingRecipeImportItem,
  youtubeGateway: YoutubeVideoMetadataGateway,
  repository: CulinaryRecipeRepository,
  pendingQueueRepository: PendingImportQueueRepository | undefined,
  setRetryingPendingId: (id: string | null) => void,
  setImportStatusMessage: (msg: string | null) => void,
  setAllRecipes: (items: CulinaryRecipeRecord[]) => void,
  setPendingImports: (items: PendingRecipeImportItem[]) => void,
  setActiveView: (view: ActiveNavigationView) => void,
): Promise<void> {
  setRetryingPendingId(item.id);
  try {
    const draft = await resolveSocialRecipeDraftFromUrl(item.sourceUrl, youtubeGateway);
    const saved = await repository.createRecipe(draft);
    if (pendingQueueRepository) {
      setPendingImports(await pendingQueueRepository.removePendingImportById(item.id));
    }
    setAllRecipes(await repository.loadAllRecipes());
    setActiveView({ kind: 'detail', recipeId: saved.id });
  } catch (err) {
    const reason = err instanceof Error ? err.message : 'Ainda indisponível';
    if (pendingQueueRepository) {
      setPendingImports(await pendingQueueRepository.enqueuePendingUrl(item.sourceUrl, reason));
    }
    setImportStatusMessage(`Ainda não foi possível extrair: ${reason}`);
  } finally {
    setRetryingPendingId(null);
  }
}

async function executeToggleFavorite(
  repository: CulinaryRecipeRepository,
  recipeId: string,
  setAllRecipes: (items: CulinaryRecipeRecord[]) => void,
): Promise<void> {
  await repository.toggleFavoriteStatus(recipeId);
  const refreshed = await repository.loadAllRecipes();
  setAllRecipes(refreshed);
}

async function executeSaveDraft(
  repository: CulinaryRecipeRepository,
  activeView: ActiveNavigationView,
  draft: RecipeDraftInput,
  setAllRecipes: (items: CulinaryRecipeRecord[]) => void,
  setActiveView: (view: ActiveNavigationView) => void,
): Promise<void> {
  const savedRecord =
    activeView.kind === 'form' && activeView.editingRecipe
      ? await repository.updateExistingRecipe(activeView.editingRecipe.id, draft)
      : await repository.createRecipe(draft);
  setAllRecipes(await repository.loadAllRecipes());
  setActiveView({ kind: 'detail', recipeId: savedRecord.id });
}

async function executeDeleteRecipe(
  repository: CulinaryRecipeRepository,
  recipeId: string,
  setAllRecipes: (items: CulinaryRecipeRecord[]) => void,
  setActiveView: (view: ActiveNavigationView) => void,
): Promise<void> {
  const remaining = await repository.deleteRecipeById(recipeId);
  setAllRecipes(remaining);
  setActiveView({ kind: 'catalog' });
}