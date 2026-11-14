import { KeyValueStorageGateway } from '../adapters/storageGateway';
import { PendingRecipeImportItem } from '../types/recipeTypes';

const PENDING_IMPORTS_KEY = '@caderno_gastronomico:pending_imports_v1';

/**
 * Repositório para fila offline de links que falharam na extração (ex: sem sinal ou bloqueio temporário).
 */
export class PendingImportQueueRepository {
  private readonly storageGateway: KeyValueStorageGateway;

  public constructor(storageGateway: KeyValueStorageGateway) {
    this.storageGateway = storageGateway;
  }

  /**
   * Carrega todos os links pendentes de importação salvos localmente.
   *
   * @example
   * const items = await queueRepo.loadPendingImports();
   */
  public async loadPendingImports(): Promise<PendingRecipeImportItem[]> {
    const serialized = await this.storageGateway.readRawString(PENDING_IMPORTS_KEY);
    if (!serialized) {
      return [];
    }
    return parsePendingImportsJson(serialized);
  }

  /**
   * Adiciona ou atualiza um link na fila offline sem duplicar a mesma URL.
   *
   * @example
   * await queueRepo.enqueuePendingUrl('https://youtu.be/abc', 'Sem internet no momento');
   */
  public async enqueuePendingUrl(
    sourceUrl: string,
    errorMessage: string,
  ): Promise<PendingRecipeImportItem[]> {
    const trimmedUrl = sourceUrl.trim();
    if (!/^https?:\/\/\S+$/i.test(trimmedUrl)) {
      throw new Error(
        `URL inválida para fila offline: "${sourceUrl}". Esperado: URL HTTP/HTTPS válida.`,
      );
    }
    const current = await this.loadPendingImports();
    const filtered = current.filter(
      (item) => item.sourceUrl.toLowerCase() !== trimmedUrl.toLowerCase(),
    );
    const nextItem = buildPendingItem(trimmedUrl, errorMessage);
    const updated = [nextItem, ...filtered];
    await this.persistQueue(updated);
    return updated;
  }

  /**
   * Remove um link da fila pendente após importação concluída ou descarte manual.
   *
   * @example
   * const remaining = await queueRepo.removePendingImportById('pending-123');
   */
  public async removePendingImportById(pendingId: string): Promise<PendingRecipeImportItem[]> {
    const current = await this.loadPendingImports();
    const remaining = current.filter((item) => item.id !== pendingId);
    await this.persistQueue(remaining);
    return remaining;
  }

  private async persistQueue(items: readonly PendingRecipeImportItem[]): Promise<void> {
    await this.storageGateway.writeRawString(PENDING_IMPORTS_KEY, JSON.stringify(items));
  }
}

function buildPendingItem(sourceUrl: string, errorMessage: string): PendingRecipeImportItem {
  return {
    id: `pending-${Date.now()}-${Math.floor(Math.random() * 1000)}`,
    sourceUrl,
    lastErrorMessage: errorMessage.trim() || 'Falha temporária de conexão',
    addedAtIso: new Date().toISOString(),
  };
}

function parsePendingImportsJson(serialized: string): PendingRecipeImportItem[] {
  try {
    const parsed: unknown = JSON.parse(serialized);
    return Array.isArray(parsed) ? (parsed as PendingRecipeImportItem[]) : [];
  } catch {
    return [];
  }
}
