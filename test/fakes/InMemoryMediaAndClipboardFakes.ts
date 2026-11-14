import type { ClipboardGateway } from '../../src/adapters/clipboardGateway';
import type {
  BackupDocumentPickerGateway,
  PickedBackupDocument,
} from '../../src/adapters/documentPickerGateway';
import type { OfflineMediaCacheGateway } from '../../src/adapters/offlineMediaCacheGateway';

/**
 * Fake nomeado em memória para simular o cache persistente de capas e vídeos offline em testes.
 */
export class InMemoryOfflineMediaCacheGateway implements OfflineMediaCacheGateway {
  public readonly storedFiles = new Map<string, string>();
  public readonly downloadedUrls: string[] = [];

  public async cacheCoverImageLocally(sourceUri: string, recipeId: string): Promise<string> {
    if (!sourceUri.trim() || this.isPersistentOfflineMediaUri(sourceUri)) {
      return sourceUri;
    }
    const localUri = `file:///document/recipes-media/${recipeId}/cover.jpg`;
    this.storedFiles.set(localUri, Buffer.from(`cover-bytes:${sourceUri}`).toString('base64'));
    return localUri;
  }

  public async persistLocalMediaFile(
    sourceUri: string,
    recipeId: string,
    mediaRole: 'cover' | 'video',
  ): Promise<string> {
    if (!sourceUri.trim() || this.isPersistentOfflineMediaUri(sourceUri)) {
      return sourceUri;
    }
    const ext = mediaRole === 'video' ? 'mp4' : 'jpg';
    const localUri = `file:///document/recipes-media/${recipeId}/${mediaRole}.${ext}`;
    this.storedFiles.set(localUri, Buffer.from(`local-bytes:${sourceUri}`).toString('base64'));
    return localUri;
  }

  public async downloadVideoStreamOffline(
    videoStreamUrl: string,
    recipeId: string,
  ): Promise<string> {
    if (!videoStreamUrl.startsWith('http')) {
      throw new Error(
        `URL inválida no Fake de mídia offline: "${videoStreamUrl}". Esperado: URL HTTP/HTTPS.`,
      );
    }
    this.downloadedUrls.push(videoStreamUrl);
    const localUri = `file:///document/recipes-media/${recipeId}/video.mp4`;
    this.storedFiles.set(localUri, Buffer.from(`mp4-stream:${videoStreamUrl}`).toString('base64'));
    return localUri;
  }

  public async readLocalFileAsBase64(localFileUri: string): Promise<string> {
    return this.storedFiles.get(localFileUri) ?? '';
  }

  public async writeBase64MediaFile(
    recipeId: string,
    relativeFilename: string,
    base64Content: string,
  ): Promise<string> {
    const destUri = `file:///restored/recipes-media/${recipeId}/${relativeFilename}`;
    this.storedFiles.set(destUri, base64Content);
    return destUri;
  }

  public isPersistentOfflineMediaUri(uri: string): boolean {
    return uri.includes('/recipes-media/');
  }
}

/**
 * Fake nomeado em memória para simular a Área de Transferência sem acessar módulo nativo.
 */
export class InMemoryClipboardGateway implements ClipboardGateway {
  private currentText: string;

  public constructor(initialText = '') {
    this.currentText = initialText;
  }

  public async readClipboardText(): Promise<string> {
    return this.currentText.trim();
  }

  public async writeClipboardText(text: string): Promise<void> {
    this.currentText = text;
  }
}

/**
 * Fake nomeado para simular seleção de arquivo de backup (.json ou .zip).
 */
export class CannedBackupDocumentPickerGateway implements BackupDocumentPickerGateway {
  private readonly nextDocument: PickedBackupDocument | null;

  public constructor(nextDocument: PickedBackupDocument | null) {
    this.nextDocument = nextDocument;
  }

  public async pickBackupFile(): Promise<PickedBackupDocument | null> {
    return this.nextDocument;
  }
}
