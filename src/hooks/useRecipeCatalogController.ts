import { useEffect, useMemo, useState } from 'react';
import {
  CulinaryRecipeRepository,
  filterCatalogRecipes,
} from '../repositories/culinaryRecipeRepository';
import {
  CatalogFilterCriteria,
  CulinaryCategory,
  CulinaryRecipeRecord,
  RecipeDraftInput,
} from '../types/recipeTypes';

export type ActiveNavigationView =
  | { readonly kind: 'catalog' }
  | { readonly kind: 'detail'; readonly recipeId: string }
  | { readonly kind: 'form'; readonly editingRecipe: CulinaryRecipeRecord | null };

export interface RecipeCatalogController {
  readonly allRecipes: readonly CulinaryRecipeRecord[];
  readonly filteredRecipes: readonly CulinaryRecipeRecord[];
  readonly filterCriteria: CatalogFilterCriteria;
  readonly isDarkMode: boolean;
  readonly activeView: ActiveNavigationView;
  readonly setActiveView: (view: ActiveNavigationView) => void;
  readonly toggleDarkMode: () => void;
  readonly updateSearchQuery: (query: string) => void;
  readonly selectCategory: (category: CulinaryCategory) => void;
  readonly toggleFavoritesOnly: () => void;
  readonly toggleFavoriteById: (recipeId: string) => Promise<void>;
  readonly saveRecipeDraft: (draft: RecipeDraftInput) => Promise<void>;
  readonly deleteRecipeById: (recipeId: string) => Promise<void>;
}

/**
 * Gerencia o estado global de navegação, filtros e operações CRUD no repositório de receitas.
 *
 * @example
 * const controller = useRecipeCatalogController(repository);
 */
export function useRecipeCatalogController(
  repository: CulinaryRecipeRepository,
): RecipeCatalogController {
  const [allRecipes, setAllRecipes] = useState<CulinaryRecipeRecord[]>([]);
  const [isDarkMode, setIsDarkMode] = useState<boolean>(false);
  const [activeView, setActiveView] = useState<ActiveNavigationView>({ kind: 'catalog' });
  const [filterCriteria, setFilterCriteria] = useState<CatalogFilterCriteria>({
    searchQuery: '',
    selectedCategory: 'Todas',
    onlyFavorites: false,
  });

  useEffect(() => {
    void repository.loadAllRecipes().then(setAllRecipes);
  }, [repository]);

  const filteredRecipes = useMemo(
    () => filterCatalogRecipes(allRecipes, filterCriteria),
    [allRecipes, filterCriteria],
  );

  return {
    allRecipes,
    filteredRecipes,
    filterCriteria,
    isDarkMode,
    activeView,
    setActiveView,
    toggleDarkMode: () => setIsDarkMode((prev) => !prev),
    updateSearchQuery: (q) => setFilterCriteria((c) => ({ ...c, searchQuery: q })),
    selectCategory: (cat) => setFilterCriteria((c) => ({ ...c, selectedCategory: cat })),
    toggleFavoritesOnly: () => setFilterCriteria((c) => ({ ...c, onlyFavorites: !c.onlyFavorites })),
    toggleFavoriteById: (id) => executeToggleFavorite(repository, id, setAllRecipes),
    saveRecipeDraft: (draft) =>
      executeSaveDraft(repository, activeView, draft, setAllRecipes, setActiveView),
    deleteRecipeById: (id) => executeDeleteRecipe(repository, id, setAllRecipes, setActiveView),
  };
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
