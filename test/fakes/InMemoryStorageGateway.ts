import { MediaLibraryPickerGateway } from '../../src/adapters/mediaPickerGateway';
import { RecipeExportGateway } from '../../src/adapters/recipeShareGateway';
import { KeyValueStorageGateway } from '../../src/adapters/storageGateway';
import { YoutubeVideoMetadataGateway } from '../../src/adapters/youtubeMetadataGateway';
import { YoutubeRemoteVideoMetadata } from '../../src/services/youtubeDescriptionParser';
import { CulinaryRecipeRecord } from '../../src/types/recipeTypes';

/**
 * Fake nomeado em memória para simular o armazenamento offline sem tocar no sistema de arquivos.
 */
export class InMemoryStorageGateway implements KeyValueStorageGateway {
  private readonly store = new Map<string, string>();

  /**
   * Lê uma string gravada no mapa em memória pela chave informada.
   *
   * @example
   * const raw = await fakeStorage.readRawString('key');
   */
  public async readRawString(storageKey: string): Promise<string | null> {
    if (!storageKey.trim()) {
      throw new Error(
        `Chave de leitura inválida no Fake: "${storageKey}". Esperado: string não vazia.`,
      );
    }
    return this.store.get(storageKey) ?? null;
  }

  /**
   * Armazena uma string serializada no mapa em memória.
   *
   * @example
   * await fakeStorage.writeRawString('key', '[]');
   */
  public async writeRawString(
    storageKey: string,
    serializedPayload: string,
  ): Promise<void> {
    if (!storageKey.trim()) {
      throw new Error(
        `Chave de gravação inválida no Fake: "${storageKey}". Esperado: string não vazia.`,
      );
    }
    this.store.set(storageKey, serializedPayload);
  }
}

/**
 * Fake nomeado para simular a seleção de fotos e vídeos da galeria em testes automatizados.
 */
export class FakeMediaLibraryPickerGateway implements MediaLibraryPickerGateway {
  private readonly nextCoverUri: string | null;
  private readonly nextVideoUri: string | null;

  public constructor(nextCoverUri: string | null, nextVideoUri: string | null) {
    this.nextCoverUri = nextCoverUri;
    this.nextVideoUri = nextVideoUri;
  }

  public async pickCoverImageFromGallery(): Promise<string | null> {
    return this.nextCoverUri;
  }

  public async pickRecipeVideoFromGallery(): Promise<string | null> {
    return this.nextVideoUri;
  }
}

/**
 * Fake nomeado para registrar chamadas de compartilhamento de texto e exportação de PDF.
 */
export class FakeRecipeExportGateway implements RecipeExportGateway {
  public readonly sharedTextRecipes: CulinaryRecipeRecord[] = [];
  public readonly exportedPdfRecipes: CulinaryRecipeRecord[] = [];

  public async shareRecipeAsText(recipe: CulinaryRecipeRecord): Promise<void> {
    this.sharedTextRecipes.push(recipe);
  }

  public async exportRecipeAsPdf(recipe: CulinaryRecipeRecord): Promise<string> {
    this.exportedPdfRecipes.push(recipe);
    return `file:///tmp/fake-export-${recipe.id}.pdf`;
  }
}

/**
 * Fake nomeado para simular a extração de metadados de vídeos de receitas do YouTube.
 */
export class FakeYoutubeVideoMetadataGateway implements YoutubeVideoMetadataGateway {
  private readonly cannedMetadata: YoutubeRemoteVideoMetadata;

  public constructor(cannedMetadata: YoutubeRemoteVideoMetadata) {
    this.cannedMetadata = cannedMetadata;
  }

  public async fetchVideoMetadataByUrl(
    youtubeUrl: string,
  ): Promise<YoutubeRemoteVideoMetadata> {
    if (!youtubeUrl.includes('youtu')) {
      throw new Error(
        `URL rejeitada pelo FakeYoutubeVideoMetadataGateway: "${youtubeUrl}". Esperado: link do YouTube.`,
      );
    }
    return this.cannedMetadata;
  }
}
