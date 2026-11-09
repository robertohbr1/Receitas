import { KeyValueStorageGateway } from '../adapters/storageGateway';
import {
  CatalogFilterCriteria,
  CulinaryRecipeRecord,
  RecipeDraftInput,
} from '../types/recipeTypes';
import { INITIAL_SEED_RECIPES } from './seedRecipesCatalog';

const RECIPES_STORAGE_KEY = '@caderno_gastronomico:recipes_v1';

/**
 * Repositório responsável por gerenciar o ciclo de vida offline das receitas culinárias.
 */
export class CulinaryRecipeRepository {
  private readonly storageGateway: KeyValueStorageGateway;

  public constructor(storageGateway: KeyValueStorageGateway) {
    this.storageGateway = storageGateway;
  }

  /**
   * Carrega todas as receitas salvas no dispositivo ou inicializa com as receitas de exemplo.
   *
   * @example
   * const recipes = await repository.loadAllRecipes();
   */
  public async loadAllRecipes(): Promise<CulinaryRecipeRecord[]> {
    const serialized = await this.storageGateway.readRawString(RECIPES_STORAGE_KEY);
    if (!serialized) {
      const initialList = [...INITIAL_SEED_RECIPES];
      await this.persistRecipeCollection(initialList);
      return initialList;
    }
    return parseStoredRecipesJson(serialized);
  }

  /**
   * Valida e adiciona uma nova receita ao armazenamento local, retornando o registro criado.
   *
   * @example
   * const saved = await repository.createRecipe(draftInput);
   */
  public async createRecipe(
    draft: RecipeDraftInput,
    customId?: string,
  ): Promise<CulinaryRecipeRecord> {
    validateRecipeDraftInput(draft);
    const existingRecipes = await this.loadAllRecipes();
    const newRecord = buildRecipeRecordFromDraft(draft, customId);
    const updatedList = [newRecord, ...existingRecipes];
    await this.persistRecipeCollection(updatedList);
    return newRecord;
  }

  /**
   * Atualiza os dados de uma receita existente mantendo seu ID e status de favorito.
   *
   * @example
   * const updated = await repository.updateExistingRecipe('seed-risoto-funghi-01', updatedDraft);
   */
  public async updateExistingRecipe(
    recipeId: string,
    draft: RecipeDraftInput,
  ): Promise<CulinaryRecipeRecord> {
    validateRecipeDraftInput(draft);
    const existingRecipes = await this.loadAllRecipes();
    const targetIndex = existingRecipes.findIndex((item) => item.id === recipeId);
    if (targetIndex === -1) {
      throw new Error(
        `Receita não encontrada para atualização. ID informado: "${recipeId}". Esperado: ID existente no catálogo.`,
      );
    }
    const updatedRecord = mergeDraftIntoRecord(existingRecipes[targetIndex], draft);
    existingRecipes[targetIndex] = updatedRecord;
    await this.persistRecipeCollection(existingRecipes);
    return updatedRecord;
  }

  /**
   * Alterna a marcação de favorita de uma receita pelo seu identificador.
   *
   * @example
   * const toggled = await repository.toggleFavoriteStatus('seed-risoto-funghi-01');
   */
  public async toggleFavoriteStatus(recipeId: string): Promise<CulinaryRecipeRecord> {
    const existingRecipes = await this.loadAllRecipes();
    const targetIndex = existingRecipes.findIndex((item) => item.id === recipeId);
    if (targetIndex === -1) {
      throw new Error(
        `Receita não encontrada ao favoritar. ID informado: "${recipeId}". Esperado: ID existente no catálogo.`,
      );
    }
    const current = existingRecipes[targetIndex];
    const updated: CulinaryRecipeRecord = { ...current, isFavorite: !current.isFavorite };
    existingRecipes[targetIndex] = updated;
    await this.persistRecipeCollection(existingRecipes);
    return updated;
  }

  /**
   * Remove permanentemente uma receita do armazenamento local pelo seu identificador.
   *
   * @example
   * await repository.deleteRecipeById('seed-bowl-salmao-03');
   */
  public async deleteRecipeById(recipeId: string): Promise<CulinaryRecipeRecord[]> {
    const existingRecipes = await this.loadAllRecipes();
    const remaining = existingRecipes.filter((item) => item.id !== recipeId);
    await this.persistRecipeCollection(remaining);
    return remaining;
  }

  /**
   * Exporta todas as receitas cadastradas em uma string JSON formatada para backup e troca de aparelho.
   *
   * @example
   * const jsonBackup = await repository.exportCatalogBackupJson();
   */
  public async exportCatalogBackupJson(): Promise<string> {
    const existingRecipes = await this.loadAllRecipes();
    return JSON.stringify(existingRecipes, null, 2);
  }

  /**
   * Importa um backup JSON de receitas, mesclando com as existentes sem duplicar IDs.
   *
   * @example
   * const updated = await repository.importCatalogBackupJson(rawBackupJson);
   */
  public async importCatalogBackupJson(rawBackupJson: string): Promise<CulinaryRecipeRecord[]> {
    const importedRecords = parseAndValidateBackupJson(rawBackupJson);
    const existingRecipes = await this.loadAllRecipes();
    const mergedList = mergeBackupRecords(existingRecipes, importedRecords);
    await this.persistRecipeCollection(mergedList);
    return mergedList;
  }

  private async persistRecipeCollection(
    recipes: readonly CulinaryRecipeRecord[],
  ): Promise<void> {
    const payload = JSON.stringify(recipes);
    await this.storageGateway.writeRawString(RECIPES_STORAGE_KEY, payload);
  }
}

/**
 * Valida se o rascunho de receita contém os campos essenciais preenchidos.
 *
 * @example
 * validateRecipeDraftInput(validDraft);
 */
export function validateRecipeDraftInput(draft: RecipeDraftInput): void {
  if (!draft.title || !draft.title.trim()) {
    throw new Error(
      `Título da receita inválido: "${draft.title}". Esperado: string não vazia com o nome do prato.`,
    );
  }
  if (!draft.ingredients || draft.ingredients.length === 0) {
    throw new Error(
      `Lista de ingredientes inválida: [${draft.ingredients.join(', ')}]. Esperado: ao menos 1 ingrediente.`,
    );
  }
  if (!draft.preparationSteps || draft.preparationSteps.length === 0) {
    throw new Error(
      `Modo de preparo inválido: [${draft.preparationSteps.join(', ')}]. Esperado: ao menos 1 passo de preparo.`,
    );
  }
}

function buildRecipeRecordFromDraft(
  draft: RecipeDraftInput,
  customId?: string,
): CulinaryRecipeRecord {
  const generatedId = customId || `recipe-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
  return {
    ...draft,
    id: generatedId,
    title: draft.title.trim(),
    isFavorite: false,
    createdAtIso: new Date().toISOString(),
  };
}

function mergeDraftIntoRecord(
  existing: CulinaryRecipeRecord,
  draft: RecipeDraftInput,
): CulinaryRecipeRecord {
  return {
    ...existing,
    ...draft,
    title: draft.title.trim(),
  };
}

function parseStoredRecipesJson(serialized: string): CulinaryRecipeRecord[] {
  try {
    const parsed: unknown = JSON.parse(serialized);
    if (!Array.isArray(parsed)) {
      throw new Error('JSON armazenado não é um array.');
    }
    return parsed as CulinaryRecipeRecord[];
  } catch {
    throw new Error(
      `Conteúdo armazenado corrompido: "${serialized.slice(0, 60)}". Esperado: array JSON válido de CulinaryRecipeRecord.`,
    );
  }
}

function parseAndValidateBackupJson(rawBackupJson: string): CulinaryRecipeRecord[] {
  const records = parseStoredRecipesJson(rawBackupJson);
  if (records.length === 0) {
    throw new Error(
      `Backup vazio recebido: "${rawBackupJson}". Esperado: array JSON contendo ao menos 1 receita.`,
    );
  }
  for (const item of records) {
    validateRecipeDraftInput(item);
  }
  return records;
}

function mergeBackupRecords(
  existing: readonly CulinaryRecipeRecord[],
  imported: readonly CulinaryRecipeRecord[],
): CulinaryRecipeRecord[] {
  const mapById = new Map<string, CulinaryRecipeRecord>();
  for (const item of imported) {
    mapById.set(item.id, item);
  }
  for (const item of existing) {
    if (!mapById.has(item.id)) {
      mapById.set(item.id, item);
    }
  }
  return Array.from(mapById.values());
}

/**
 * Filtra uma lista de receitas combinando busca por texto (nome, ingrediente ou tag),
 * categoria selecionada e filtro de favoritas.
 *
 * @example
 * const visible = filterCatalogRecipes(allRecipes, { searchQuery: 'cenoura', selectedCategory: 'Todas', onlyFavorites: false });
 */
export function filterCatalogRecipes(
  recipes: readonly CulinaryRecipeRecord[],
  criteria: CatalogFilterCriteria,
): CulinaryRecipeRecord[] {
  return recipes.filter((recipe) => {
    if (criteria.onlyFavorites && !recipe.isFavorite) return false;
    if (criteria.selectedCategory !== 'Todas' && recipe.category !== criteria.selectedCategory) {
      return false;
    }
    return matchesRecipeSearchQuery(recipe, criteria.searchQuery);
  });
}

/**
 * Verifica se o termo pesquisado ocorre no título, nos ingredientes, nas tags ou nas notas da receita.
 *
 * @example
 * const hit = matchesRecipeSearchQuery(risotoRecipe, 'funghi');
 * // hit === true
 */
export function matchesRecipeSearchQuery(
  recipe: CulinaryRecipeRecord,
  rawQuery: string,
): boolean {
  const normalizedQuery = rawQuery.trim().toLowerCase();
  if (!normalizedQuery) return true;
  const searchableFields = [
    recipe.title,
    recipe.category,
    recipe.unifiedChefNotesAndNutrition,
    ...recipe.ingredients,
    ...recipe.tags,
  ];
  return searchableFields.some((field) => field.toLowerCase().includes(normalizedQuery));
}
