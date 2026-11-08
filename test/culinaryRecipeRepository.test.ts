import {
  CulinaryRecipeRepository,
  filterCatalogRecipes,
  matchesRecipeSearchQuery,
  validateRecipeDraftInput,
} from '../src/repositories/culinaryRecipeRepository';
import { RecipeDraftInput } from '../src/types/recipeTypes';
import { InMemoryStorageGateway } from './fakes/InMemoryStorageGateway';

function createSampleValidDraft(): RecipeDraftInput {
  return {
    title: 'Nhoque de Batata Doce',
    category: 'Massas',
    coverImageUri: 'https://images.unsplash.com/photo-1551183053-bf91a1d81141',
    videoSourceUri: 'https://youtu.be/2Hj2h1rR2vY',
    preparationMinutes: 40,
    servingsCount: 4,
    difficulty: 'Médio',
    ingredients: ['500g de batata doce cozida', '1 xícara de farinha de aveia'],
    preparationSteps: ['Amasse as batatas ainda mornas', 'Cozinhe em água fervente por 3 minutos'],
    unifiedChefNotesAndNutrition: 'Dica: congele aberto em assadeira. 290 kcal por porção.',
    tags: ['Vegano', 'Almoço'],
  };
}

describe('CulinaryRecipeRepository', () => {
  it('inicializa com as receitas sementes quando o armazenamento está vazio', async () => {
    const fakeStorage = new InMemoryStorageGateway();
    const repository = new CulinaryRecipeRepository(fakeStorage);
    const loaded = await repository.loadAllRecipes();
    expect(loaded.length).toBeGreaterThanOrEqual(3);
  });

  it('cria, atualiza, favorita e exclui uma receita persistindo no InMemoryStorageGateway', async () => {
    const fakeStorage = new InMemoryStorageGateway();
    const repository = new CulinaryRecipeRepository(fakeStorage);
    const created = await repository.createRecipe(createSampleValidDraft(), 'custom-nhoque-01');
    expect(created.id).toBe('custom-nhoque-01');

    const toggled = await repository.toggleFavoriteStatus('custom-nhoque-01');
    expect(toggled.isFavorite).toBe(true);

    const updated = await repository.updateExistingRecipe('custom-nhoque-01', {
      ...createSampleValidDraft(),
      title: 'Nhoque Dourado na Manteiga',
    });
    expect(updated.title).toBe('Nhoque Dourado na Manteiga');

    const afterDelete = await repository.deleteRecipeById('custom-nhoque-01');
    expect(afterDelete.some((item) => item.id === 'custom-nhoque-01')).toBe(false);
  });

  it('valida campos obrigatórios do rascunho de receita com mensagem detalhada', () => {
    expect(() =>
      validateRecipeDraftInput({ ...createSampleValidDraft(), title: '   ' }),
    ).toThrow(/Título da receita inválido/);
    expect(() =>
      validateRecipeDraftInput({ ...createSampleValidDraft(), ingredients: [] }),
    ).toThrow(/Lista de ingredientes inválida/);
  });

  it('filtra receitas combinando busca por ingrediente, categoria e status de favorita', async () => {
    const fakeStorage = new InMemoryStorageGateway();
    const repository = new CulinaryRecipeRepository(fakeStorage);
    const allRecipes = await repository.loadAllRecipes();

    const byIngredient = filterCatalogRecipes(allRecipes, {
      searchQuery: 'funghi',
      selectedCategory: 'Todas',
      onlyFavorites: false,
    });
    expect(byIngredient).toHaveLength(1);
    expect(matchesRecipeSearchQuery(byIngredient[0], 'arbóreo')).toBe(true);
  });
});
