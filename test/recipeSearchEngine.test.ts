import {
  filterCatalogRecipes,
  matchesRecipeSearchQuery,
  normalizeSearchText,
  sortCatalogRecipes,
  tokenizeSearchQuery,
} from '../src/services/recipeSearchEngine';
import { CulinaryRecipeRecord } from '../src/types/recipeTypes';

function createMockRecipe(overrides: Partial<CulinaryRecipeRecord>): CulinaryRecipeRecord {
  return {
    id: 'rec-default',
    title: 'Pão de Queijo Mineiro',
    category: 'Lanches',
    coverImageUri: '',
    videoSourceUri: 'https://youtu.be/eydMbeMvEe8',
    preparationMinutes: 35,
    servingsCount: 6,
    difficulty: 'Fácil',
    ingredients: [
      '500g de polvilho azedo',
      '200g de queijo meia cura ralado',
      '2 ovos inteiros',
    ],
    preparationSteps: [
      'Escalde o polvilho com água e óleo ferventes',
      'Asse em forno a 180°C por 25 minutos até dourar',
    ],
    unifiedChefNotesAndNutrition: 'Clássico mineiro crocante.',
    videoTranscriptText: 'O segredo da vovó é escaldar bem o polvilho antes de colocar os ovos.',
    tags: ['Mineiro', 'Sem Glúten'],
    isFavorite: false,
    createdAtIso: '2026-11-10T10:00:00.000Z',
    ...overrides,
  };
}

describe('recipeSearchEngine', () => {
  it('normaliza acentos e divide múltiplos termos de busca', () => {
    expect(normalizeSearchText('Pão de Açúcar & Café')).toBe('pao de acucar & cafe');
    expect(tokenizeSearchQuery('frango, batata doce; alho')).toEqual([
      'frango',
      'batata',
      'doce',
      'alho',
    ]);
  });

  it('encontra receitas ignorando acentos e combinando múltiplos ingredientes', () => {
    const recipe = createMockRecipe({});
    expect(matchesRecipeSearchQuery(recipe, 'pao de queijo')).toBe(true);
    expect(matchesRecipeSearchQuery(recipe, 'sem gluten')).toBe(true);
    expect(matchesRecipeSearchQuery(recipe, 'polvilho ovos')).toBe(true);
    expect(matchesRecipeSearchQuery(recipe, 'polvilho chocolate')).toBe(false);
  });

  it('pesquisa também nos passos de preparo e na transcrição falada do vídeo', () => {
    const recipe = createMockRecipe({});
    expect(matchesRecipeSearchQuery(recipe, 'escalde')).toBe(true);
    expect(matchesRecipeSearchQuery(recipe, 'segredo da vovo')).toBe(true);
  });

  it('filtra por tempo máximo, quantidade máxima de ingredientes e ordena o catálogo', () => {
    const fastSnack = createMockRecipe({
      id: 'fast-1',
      title: 'Omelete Express',
      preparationMinutes: 10,
      ingredients: ['2 ovos', 'Sal a gosto'],
    });
    const slowRoast = createMockRecipe({
      id: 'slow-2',
      title: 'Costela Assada',
      preparationMinutes: 120,
      ingredients: ['1kg de costela', 'Sal grosso', 'Alho', 'Cebola', 'Louro', 'Vinho', 'Pimenta'],
    });

    const filteredFast = filterCatalogRecipes([slowRoast, fastSnack], {
      searchQuery: '',
      selectedCategory: 'Todas',
      onlyFavorites: false,
      maxPrepMinutes: 30,
    });
    expect(filteredFast.map((r) => r.id)).toEqual(['fast-1']);

    const filteredFewIngs = filterCatalogRecipes([slowRoast, fastSnack], {
      searchQuery: '',
      selectedCategory: 'Todas',
      onlyFavorites: false,
      maxIngredientsCount: 6,
    });
    expect(filteredFewIngs.map((r) => r.id)).toEqual(['fast-1']);

    const sortedFastest = sortCatalogRecipes([slowRoast, fastSnack], 'fastest');
    expect(sortedFastest.map((r) => r.id)).toEqual(['fast-1', 'slow-2']);
  });
});
