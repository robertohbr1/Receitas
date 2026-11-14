import type { OfflineMediaCacheGateway } from '../adapters/offlineMediaCacheGateway';
import { KeyValueStorageGateway } from '../adapters/storageGateway';
import { isLocalGalleryUri } from '../services/videoUrlClassifier';
import {
  decodeCatalogFromZipBase64,
  encodeCatalogToZipBase64,
} from '../services/zipBackupCodec';
import {
  filterCatalogRecipes,
  matchesRecipeSearchQuery,
} from '../services/recipeSearchEngine';
import {
  CulinaryRecipeRecord,
  RecipeDraftInput,
} from '../types/recipeTypes';
import { INITIAL_SEED_RECIPES } from './seedRecipesCatalog';

export { filterCatalogRecipes, matchesRecipeSearchQuery };

const RECIPES_STORAGE_KEY = '@caderno_gastronomico:recipes_v1';

/**
 * Repositório responsável por gerenciar o ciclo de vida offline das receitas culinárias.
 */
export class CulinaryRecipeRepository {
  private readonly storageGateway: KeyValueStorageGateway;
  private readonly mediaCacheGateway?: OfflineMediaCacheGateway;

  public constructor(
    storageGateway: KeyValueStorageGateway,
    mediaCacheGateway?: OfflineMediaCacheGateway,
  ) {
    this.storageGateway = storageGateway;
    this.mediaCacheGateway = mediaCacheGateway;
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
    const targetId = customId || generateRecipeId();
    const cachedDraft = await cacheDraftMediaOffline(draft, targetId, this.mediaCacheGateway);
    const existingRecipes = await this.loadAllRecipes();
    const newRecord = buildRecipeRecordFromDraft(cachedDraft, targetId);
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
    const cachedDraft = await cacheDraftMediaOffline(draft, recipeId, this.mediaCacheGateway);
    const updatedRecord = mergeDraftIntoRecord(existingRecipes[targetIndex], cachedDraft);
    existingRecipes[targetIndex] = updatedRecord;
    await this.persistRecipeCollection(existingRecipes);
    return updatedRecord;
  }

  /**
   * Faz o download offline do stream MP4 associado à receita e aponta videoSourceUri para o arquivo local.
   *
   * @example
   * const offline = await repository.saveOfflineVideoForRecipe('recipe-123');
   */
  public async saveOfflineVideoForRecipe(recipeId: string): Promise<CulinaryRecipeRecord> {
    if (!this.mediaCacheGateway) {
      throw new Error(
        `Cache de mídia offline não configurado ao salvar vídeo da receita "${recipeId}". Esperado: OfflineMediaCacheGateway injetado.`,
      );
    }
    const existingRecipes = await this.loadAllRecipes();
    const targetIndex = existingRecipes.findIndex((item) => item.id === recipeId);
    if (targetIndex === -1) {
      throw new Error(
        `Receita não encontrada ao baixar vídeo. ID informado: "${recipeId}". Esperado: ID existente no catálogo.`,
      );
    }
    const current = existingRecipes[targetIndex];
    const streamUrl = resolveDownloadableStreamUrl(current);
    const localVideoUri = await this.mediaCacheGateway.downloadVideoStreamOffline(streamUrl, recipeId);
    const updated: CulinaryRecipeRecord = {
      ...current,
      videoSourceUri: localVideoUri,
      originalSourceUrl: current.originalSourceUrl || current.videoSourceUri,
      archivedAtIso: new Date().toISOString(),
    };
    existingRecipes[targetIndex] = updated;
    await this.persistRecipeCollection(existingRecipes);
    return updated;
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

  /**
   * Exporta o catálogo completo (receitas + capas e vídeos offline) em um arquivo .zip Base64.
   *
   * @example
   * const zipBase64 = await repository.exportCatalogZipBase64();
   */
  public async exportCatalogZipBase64(): Promise<string> {
    if (!this.mediaCacheGateway) {
      throw new Error(
        'Cache de mídia não configurado para exportar ZIP. Esperado: OfflineMediaCacheGateway injetado.',
      );
    }
    const existingRecipes = await this.loadAllRecipes();
    return encodeCatalogToZipBase64(existingRecipes, this.mediaCacheGateway);
  }

  /**
   * Importa um pacote .zip Base64 restaurando receitas e arquivos de mídia locais sem duplicar IDs.
   *
   * @example
   * const updated = await repository.importCatalogZipBase64(zipBase64);
   */
  public async importCatalogZipBase64(zipBase64: string): Promise<CulinaryRecipeRecord[]> {
    if (!this.mediaCacheGateway) {
      throw new Error(
        'Cache de mídia não configurado para restaurar ZIP. Esperado: OfflineMediaCacheGateway injetado.',
      );
    }
    const importedRecords = await decodeCatalogFromZipBase64(zipBase64, this.mediaCacheGateway);
    for (const item of importedRecords) {
      validateRecipeDraftInput(item);
    }
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

function generateRecipeId(): string {
  return `recipe-${Date.now()}-${Math.floor(Math.random() * 10000)}`;
}

async function cacheDraftMediaOffline(
  draft: RecipeDraftInput,
  recipeId: string,
  mediaCache?: OfflineMediaCacheGateway,
): Promise<RecipeDraftInput> {
  if (!mediaCache) {
    return draft;
  }
  const coverImageUri = draft.coverImageUri
    ? await mediaCache.cacheCoverImageLocally(draft.coverImageUri, recipeId)
    : '';
  const videoSourceUri = isLocalGalleryUri(draft.videoSourceUri.toLowerCase())
    ? await mediaCache.persistLocalMediaFile(draft.videoSourceUri, recipeId, 'video')
    : draft.videoSourceUri;
  return {
    ...draft,
    coverImageUri,
    videoSourceUri,
    originalSourceUrl: draft.originalSourceUrl || resolveInitialOriginalUrl(draft.videoSourceUri),
    archivedAtIso: draft.archivedAtIso ?? new Date().toISOString(),
  };
}

function resolveInitialOriginalUrl(videoUri: string): string | undefined {
  return /^https?:\/\//i.test(videoUri.trim()) ? videoUri.trim() : undefined;
}

function resolveDownloadableStreamUrl(record: CulinaryRecipeRecord): string {
  const candidate = record.offlineVideoStreamUrl || record.videoSourceUri;
  if (!/^https?:\/\//i.test(candidate.trim())) {
    throw new Error(
      `Receita "${record.title}" não possui URL MP4 direta disponível para download: "${candidate}". Esperado: stream HTTP/HTTPS.`,
    );
  }
  return candidate.trim();
}

function buildRecipeRecordFromDraft(
  draft: RecipeDraftInput,
  customId?: string,
): CulinaryRecipeRecord {
  const generatedId = customId || generateRecipeId();
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
    originalSourceUrl: draft.originalSourceUrl ?? existing.originalSourceUrl,
    offlineVideoStreamUrl: draft.offlineVideoStreamUrl ?? existing.offlineVideoStreamUrl,
    archivedAtIso: draft.archivedAtIso ?? existing.archivedAtIso,
    videoTranscriptText: draft.videoTranscriptText ?? existing.videoTranscriptText,
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
