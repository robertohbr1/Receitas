import {
  CatalogFilterCriteria,
  CatalogSortOrder,
  CulinaryRecipeRecord,
} from '../types/recipeTypes';
import { countRecipeListItems } from './recipeGroupHeadings';

/**
 * Normaliza um texto para busca insensível a acentos (diacríticos) e caixa alta/baixa.
 *
 * @example
 * normalizeSearchText('Pão de Açúcar'); // 'pao de acucar'
 */
export function normalizeSearchText(rawText: string): string {
  return rawText
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

/**
 * Divide a consulta de busca do usuário em termos normalizados independentes (separados por espaço, vírgula ou ponto-e-vírgula).
 *
 * @example
 * tokenizeSearchQuery('Frango, batata doce'); // ['frango', 'batata', 'doce']
 */
export function tokenizeSearchQuery(rawQuery: string): string[] {
  const normalized = normalizeSearchText(rawQuery);
  if (!normalized) return [];
  return normalized
    .split(/[\s,;]+/)
    .map((token) => token.trim())
    .filter((token) => token.length > 0);
}

/**
 * Verifica se todos os termos pesquisados ocorrem no título, categoria, ingredientes,
 * modo de preparo, tags, notas ou transcrição do vídeo da receita (ignorando acentos).
 *
 * @example
 * matchesRecipeSearchQuery(risotoRecipe, 'arroz arboreo funghi'); // true
 */
export function matchesRecipeSearchQuery(
  recipe: CulinaryRecipeRecord,
  rawQuery: string,
): boolean {
  const queryTokens = tokenizeSearchQuery(rawQuery);
  if (queryTokens.length === 0) return true;
  const searchableCorpus = buildRecipeSearchableCorpus(recipe);
  return queryTokens.every((token) => searchableCorpus.includes(token));
}

function buildRecipeSearchableCorpus(recipe: CulinaryRecipeRecord): string {
  const fields: readonly string[] = [
    recipe.title,
    recipe.category,
    recipe.difficulty,
    recipe.unifiedChefNotesAndNutrition,
    recipe.videoTranscriptText ?? '',
    ...recipe.ingredients,
    ...recipe.preparationSteps,
    ...recipe.tags,
  ];
  return normalizeSearchText(fields.join(' '));
}

/**
 * Filtra e ordena uma lista de receitas combinando busca multi-termos sem acento,
 * categoria, favoritas, tempo máximo, limite de ingredientes e ordenação.
 *
 * @example
 * const visible = filterCatalogRecipes(allRecipes, { searchQuery: 'cenoura', selectedCategory: 'Todas', onlyFavorites: false });
 */
export function filterCatalogRecipes(
  recipes: readonly CulinaryRecipeRecord[],
  criteria: CatalogFilterCriteria,
): CulinaryRecipeRecord[] {
  const matched = recipes.filter((recipe) => matchesAllFilterCriteria(recipe, criteria));
  return sortCatalogRecipes(matched, criteria.sortBy ?? 'recent');
}

function matchesAllFilterCriteria(
  recipe: CulinaryRecipeRecord,
  criteria: CatalogFilterCriteria,
): boolean {
  if (criteria.onlyFavorites && !recipe.isFavorite) return false;
  if (criteria.selectedCategory !== 'Todas' && recipe.category !== criteria.selectedCategory) {
    return false;
  }
  if (criteria.maxPrepMinutes && recipe.preparationMinutes > criteria.maxPrepMinutes) {
    return false;
  }
  if (
    criteria.maxIngredientsCount &&
    countRecipeListItems(recipe.ingredients) > criteria.maxIngredientsCount
  ) {
    return false;
  }
  return matchesRecipeSearchQuery(recipe, criteria.searchQuery);
}

/**
 * Ordena a lista de receitas conforme o critério selecionado pelo usuário.
 *
 * @example
 * const fastest = sortCatalogRecipes(recipes, 'fastest');
 */
export function sortCatalogRecipes(
  recipes: readonly CulinaryRecipeRecord[],
  sortBy: CatalogSortOrder,
): CulinaryRecipeRecord[] {
  const copy = [...recipes];
  if (sortBy === 'fastest') {
    return copy.sort((a, b) => a.preparationMinutes - b.preparationMinutes);
  }
  if (sortBy === 'fewest_ingredients') {
    return copy.sort(
      (a, b) => countRecipeListItems(a.ingredients) - countRecipeListItems(b.ingredients),
    );
  }
  return copy;
}