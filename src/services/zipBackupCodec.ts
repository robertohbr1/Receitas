import JSZip from 'jszip';
import type { OfflineMediaCacheGateway } from '../adapters/offlineMediaCacheGateway';
import { CulinaryRecipeRecord } from '../types/recipeTypes';

const ZIP_MEDIA_PREFIX = 'zip-media://';
const RECIPES_ENTRY_NAME = 'recipes.json';

/**
 * Empacota todas as receitas e mídias locais (capas e vídeos offline) em um arquivo .zip Base64 portável.
 *
 * @example
 * const base64Zip = await encodeCatalogToZipBase64(recipes, mediaCache);
 */
export async function encodeCatalogToZipBase64(
  recipes: readonly CulinaryRecipeRecord[],
  mediaCache: OfflineMediaCacheGateway,
): Promise<string> {
  const archive = new JSZip();
  const portableRecipes: CulinaryRecipeRecord[] = [];
  for (const recipe of recipes) {
    portableRecipes.push(await bundleRecipeMediaIntoZip(archive, recipe, mediaCache));
  }
  archive.file(RECIPES_ENTRY_NAME, JSON.stringify(portableRecipes, null, 2));
  return archive.generateAsync({ type: 'base64' });
}

/**
 * Lê um arquivo .zip Base64 de backup, restaura as mídias no aparelho e retorna as receitas com URIs atualizadas.
 *
 * @example
 * const restored = await decodeCatalogFromZipBase64(zipBase64, mediaCache);
 */
export async function decodeCatalogFromZipBase64(
  zipBase64: string,
  mediaCache: OfflineMediaCacheGateway,
): Promise<CulinaryRecipeRecord[]> {
  const archive = await loadZipArchiveSafely(zipBase64);
  const recipesEntry = archive.file(RECIPES_ENTRY_NAME);
  if (!recipesEntry) {
    throw new Error(
      `Pacote ZIP inválido: arquivo "${RECIPES_ENTRY_NAME}" ausente. Esperado: backup gerado pelo Caderno Gastronômico.`,
    );
  }
  const rawJson = await recipesEntry.async('string');
  const parsedRecipes = parseZipRecipesJson(rawJson);
  const restored: CulinaryRecipeRecord[] = [];
  for (const recipe of parsedRecipes) {
    restored.push(await restoreRecipeMediaFromZip(archive, recipe, mediaCache));
  }
  return restored;
}

async function bundleRecipeMediaIntoZip(
  archive: JSZip,
  recipe: CulinaryRecipeRecord,
  mediaCache: OfflineMediaCacheGateway,
): Promise<CulinaryRecipeRecord> {
  const bundledCover = await tryPackMediaEntry(
    archive,
    recipe.id,
    recipe.coverImageUri,
    'cover',
    mediaCache,
  );
  const bundledVideo = await tryPackMediaEntry(
    archive,
    recipe.id,
    recipe.videoSourceUri,
    'video',
    mediaCache,
  );
  return { ...recipe, coverImageUri: bundledCover, videoSourceUri: bundledVideo };
}

async function tryPackMediaEntry(
  archive: JSZip,
  recipeId: string,
  rawUri: string,
  role: 'cover' | 'video',
  mediaCache: OfflineMediaCacheGateway,
): Promise<string> {
  if (!rawUri || !isLocalBundleableUri(rawUri, mediaCache)) {
    return rawUri;
  }
  const base64Data = await mediaCache.readLocalFileAsBase64(rawUri);
  if (!base64Data) {
    return rawUri;
  }
  const ext = extractExtensionOrDefault(rawUri, role === 'video' ? 'mp4' : 'jpg');
  const entryPath = `media/${sanitizeZipSegment(recipeId)}/${role}.${ext}`;
  archive.file(entryPath, base64Data, { base64: true });
  return `${ZIP_MEDIA_PREFIX}${entryPath}`;
}

function isLocalBundleableUri(uri: string, mediaCache: OfflineMediaCacheGateway): boolean {
  return mediaCache.isPersistentOfflineMediaUri(uri) || uri.startsWith('file://');
}

async function restoreRecipeMediaFromZip(
  archive: JSZip,
  recipe: CulinaryRecipeRecord,
  mediaCache: OfflineMediaCacheGateway,
): Promise<CulinaryRecipeRecord> {
  const coverImageUri = await tryRestoreMediaEntry(archive, recipe.id, recipe.coverImageUri, mediaCache);
  const videoSourceUri = await tryRestoreMediaEntry(archive, recipe.id, recipe.videoSourceUri, mediaCache);
  return { ...recipe, coverImageUri, videoSourceUri };
}

async function tryRestoreMediaEntry(
  archive: JSZip,
  recipeId: string,
  uriOrMarker: string,
  mediaCache: OfflineMediaCacheGateway,
): Promise<string> {
  if (!uriOrMarker.startsWith(ZIP_MEDIA_PREFIX)) {
    return uriOrMarker;
  }
  const relativeEntryPath = uriOrMarker.slice(ZIP_MEDIA_PREFIX.length);
  const zipEntry = archive.file(relativeEntryPath);
  if (!zipEntry) {
    return '';
  }
  const base64Data = await zipEntry.async('base64');
  const filename = relativeEntryPath.split('/').pop() ?? 'media.bin';
  const savedUri = await mediaCache.writeBase64MediaFile(recipeId, filename, base64Data);
  return savedUri || '';
}

async function loadZipArchiveSafely(zipBase64: string): Promise<JSZip> {
  if (!zipBase64.trim()) {
    throw new Error('Conteúdo ZIP vazio recebido. Esperado: string Base64 de arquivo .zip válido.');
  }
  try {
    return await JSZip.loadAsync(zipBase64, { base64: true });
  } catch {
    throw new Error(
      `Arquivo ZIP corrompido ou ilegível (${zipBase64.length} chars). Esperado: arquivo .zip válido.`,
    );
  }
}

function parseZipRecipesJson(rawJson: string): CulinaryRecipeRecord[] {
  const parsed: unknown = JSON.parse(rawJson);
  if (!Array.isArray(parsed) || parsed.length === 0) {
    throw new Error(
      `Conteúdo "${RECIPES_ENTRY_NAME}" inválido ou vazio no ZIP. Esperado: lista não vazia de receitas.`,
    );
  }
  return parsed as CulinaryRecipeRecord[];
}

function extractExtensionOrDefault(uri: string, fallback: string): string {
  const clean = uri.split('?')[0].split('#')[0];
  const match = clean.match(/\.([a-zA-Z0-9]{2,5})$/);
  return match && match[1] ? match[1].toLowerCase() : fallback;
}

function sanitizeZipSegment(segment: string): string {
  return segment.replace(/[^a-zA-Z0-9._-]/g, '_') || 'recipe';
}