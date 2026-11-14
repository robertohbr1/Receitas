import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Contrato proprietário para salvar capas e vídeos localmente em armazenamento persistente do app.
 */
export interface OfflineMediaCacheGateway {
  cacheCoverImageLocally(sourceUri: string, recipeId: string): Promise<string>;
  persistLocalMediaFile(
    sourceUri: string,
    recipeId: string,
    mediaRole: 'cover' | 'video',
  ): Promise<string>;
  downloadVideoStreamOffline(videoStreamUrl: string, recipeId: string): Promise<string>;
  readLocalFileAsBase64(localFileUri: string): Promise<string>;
  writeBase64MediaFile(
    recipeId: string,
    relativeFilename: string,
    base64Content: string,
  ): Promise<string>;
  isPersistentOfflineMediaUri(uri: string): boolean;
}

const MEDIA_FOLDER_NAME = 'recipes-media';

/**
 * Adaptador concreto baseado em expo-file-system para preservar capas e vídeos offline em documentDirectory.
 */
export class ExpoFileSystemMediaCacheGateway implements OfflineMediaCacheGateway {
  /**
   * Garante que a capa (URL remota ou URI temporária da galeria) seja salva de forma persistente no aparelho.
   *
   * @example
   * const localUri = await mediaCache.cacheCoverImageLocally('https://img.site/bolo.jpg', 'rec-01');
   */
  public async cacheCoverImageLocally(sourceUri: string, recipeId: string): Promise<string> {
    const trimmed = sourceUri.trim();
    if (!trimmed || Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return trimmed;
    }
    if (this.isPersistentOfflineMediaUri(trimmed)) {
      return trimmed;
    }
    if (/^https?:\/\//i.test(trimmed)) {
      return downloadCoverSafely(trimmed, recipeId);
    }
    return this.persistLocalMediaFile(trimmed, recipeId, 'cover');
  }

  /**
   * Copia um arquivo local selecionado na galeria para a pasta persistente da receita em documentDirectory.
   *
   * @example
   * const stored = await mediaCache.persistLocalMediaFile('file:///cache/video.mp4', 'rec-01', 'video');
   */
  public async persistLocalMediaFile(
    sourceUri: string,
    recipeId: string,
    mediaRole: 'cover' | 'video',
  ): Promise<string> {
    const trimmed = sourceUri.trim();
    if (!trimmed || Platform.OS === 'web' || !FileSystem.documentDirectory) {
      return trimmed;
    }
    if (this.isPersistentOfflineMediaUri(trimmed) || /^https?:\/\//i.test(trimmed)) {
      return trimmed;
    }
    return copyFileIntoRecipeDirectory(trimmed, recipeId, mediaRole);
  }

  /**
   * Faz o download de um stream de vídeo (.mp4) para reprodução 100% offline.
   *
   * @example
   * const mp4Path = await mediaCache.downloadVideoStreamOffline('https://cdn.ig/reel.mp4', 'rec-01');
   */
  public async downloadVideoStreamOffline(
    videoStreamUrl: string,
    recipeId: string,
  ): Promise<string> {
    if (!/^https?:\/\//i.test(videoStreamUrl.trim())) {
      throw new Error(
        `URL de stream inválida para download offline: "${videoStreamUrl}". Esperado: URL HTTP/HTTPS de vídeo.`,
      );
    }
    if (Platform.OS === 'web' || !FileSystem.documentDirectory) {
      throw new Error(
        `Download offline indisponível na plataforma "${Platform.OS}". Esperado: ambiente nativo Android ou iOS.`,
      );
    }
    return executeVideoDownload(videoStreamUrl.trim(), recipeId);
  }

  /**
   * Lê um arquivo local persistido no aparelho como string Base64 (para pacotes .zip de backup).
   *
   * @example
   * const base64 = await mediaCache.readLocalFileAsBase64('file:///.../cover.jpg');
   */
  public async readLocalFileAsBase64(localFileUri: string): Promise<string> {
    if (!localFileUri.trim() || Platform.OS === 'web') {
      return '';
    }
    try {
      return await FileSystem.readAsStringAsync(localFileUri, {
        encoding: FileSystem.EncodingType.Base64,
      });
    } catch {
      return '';
    }
  }

  /**
   * Restaura um arquivo Base64 dentro da pasta persistente da receita (ao importar backup .zip).
   *
   * @example
   * const uri = await mediaCache.writeBase64MediaFile('rec-01', 'cover.jpg', base64Data);
   */
  public async writeBase64MediaFile(
    recipeId: string,
    relativeFilename: string,
    base64Content: string,
  ): Promise<string> {
    if (!FileSystem.documentDirectory || Platform.OS === 'web') {
      return '';
    }
    const dirUri = await ensureRecipeMediaDirectory(recipeId);
    const destUri = `${dirUri}${sanitizeFilename(relativeFilename)}`;
    await FileSystem.writeAsStringAsync(destUri, base64Content, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return destUri;
  }

  /**
   * Verifica se a URI já aponta para a pasta permanente do aplicativo em documentDirectory.
   *
   * @example
   * mediaCache.isPersistentOfflineMediaUri('file:///data/.../recipes-media/rec-01/cover.jpg'); // true
   */
  public isPersistentOfflineMediaUri(uri: string): boolean {
    const trimmed = uri.trim();
    return trimmed.includes(`/${MEDIA_FOLDER_NAME}/`);
  }
}

async function ensureRecipeMediaDirectory(recipeId: string): Promise<string> {
  const baseDoc = FileSystem.documentDirectory ?? '';
  const safeId = sanitizeFilename(recipeId);
  const dirUri = `${baseDoc}${MEDIA_FOLDER_NAME}/${safeId}/`;
  await FileSystem.makeDirectoryAsync(dirUri, { intermediates: true });
  return dirUri;
}

async function downloadCoverSafely(remoteUrl: string, recipeId: string): Promise<string> {
  try {
    const dirUri = await ensureRecipeMediaDirectory(recipeId);
    const ext = resolveMediaExtension(remoteUrl, 'jpg');
    const destUri = `${dirUri}cover-${Date.now()}.${ext}`;
    const result = await FileSystem.downloadAsync(remoteUrl, destUri);
    return result.status >= 200 && result.status < 300 ? result.uri : remoteUrl;
  } catch {
    return remoteUrl;
  }
}

async function copyFileIntoRecipeDirectory(
  sourceUri: string,
  recipeId: string,
  mediaRole: 'cover' | 'video',
): Promise<string> {
  try {
    const dirUri = await ensureRecipeMediaDirectory(recipeId);
    const fallbackExt = mediaRole === 'video' ? 'mp4' : 'jpg';
    const ext = resolveMediaExtension(sourceUri, fallbackExt);
    const destUri = `${dirUri}${mediaRole}-${Date.now()}.${ext}`;
    await FileSystem.copyAsync({ from: sourceUri, to: destUri });
    return destUri;
  } catch {
    return sourceUri;
  }
}

async function executeVideoDownload(remoteUrl: string, recipeId: string): Promise<string> {
  const dirUri = await ensureRecipeMediaDirectory(recipeId);
  const ext = resolveMediaExtension(remoteUrl, 'mp4');
  const destUri = `${dirUri}video-${Date.now()}.${ext}`;
  const result = await FileSystem.downloadAsync(remoteUrl, destUri);
  if (result.status < 200 || result.status >= 300) {
    throw new Error(
      `Falha ao baixar vídeo offline (HTTP ${result.status}) de "${remoteUrl}". Esperado: resposta 2xx com arquivo MP4.`,
    );
  }
  return result.uri;
}

function resolveMediaExtension(uri: string, fallbackExt: string): string {
  const withoutQuery = uri.split('?')[0].split('#')[0];
  const match = withoutQuery.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match && match[1] ? match[1].toLowerCase() : fallbackExt;
}

function sanitizeFilename(rawName: string): string {
  return rawName.replace(/[^a-zA-Z0-9._-]/g, '_') || 'item';
}
