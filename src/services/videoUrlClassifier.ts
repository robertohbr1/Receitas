import { RecipeVideoDescriptor, VideoProviderKind } from '../types/recipeTypes';

const YOUTUBE_ID_PATTERNS: readonly RegExp[] = [
  /(?:youtube\.com\/watch\?v=|youtu\.be\/|youtube\.com\/embed\/|youtube\.com\/shorts\/)([A-Za-z0-9_-]{11})/,
];

const INSTAGRAM_SHORTCODE_PATTERN =
  /instagram\.com\/(?:[\w.]+\/)?(?:reel|reels|p|tv)\/([A-Za-z0-9_-]+)/i;

const GLOBOPLAY_VIDEO_ID_PATTERN = /globoplay\.globo\.com\/v\/(\d+)/i;

/**
 * Extrai o ID numérico de um vídeo do Globoplay (Receitas Globo), se presente.
 *
 * @example
 * const id = extractGloboplayVideoId('https://globoplay.globo.com/v/15168194/');
 * // id === '15168194'
 */
export function extractGloboplayVideoId(rawUri: string): string | null {
  const match = rawUri.trim().match(GLOBOPLAY_VIDEO_ID_PATTERN);
  return match && match[1] ? match[1] : null;
}

/**
 * Extrai o identificador de 11 caracteres de uma URL do YouTube, se presente.
 *
 * @example
 * const videoId = extractYoutubeVideoId('https://youtu.be/dQw4w9WgXcQ');
 * // videoId === 'dQw4w9WgXcQ'
 */
export function extractYoutubeVideoId(rawUri: string): string | null {
  const trimmedUri = rawUri.trim();
  for (const pattern of YOUTUBE_ID_PATTERNS) {
    const match = trimmedUri.match(pattern);
    if (match && match[1]) {
      return match[1];
    }
  }
  return null;
}

/**
 * Extrai o shortcode de um Reel, Post ou IGTV a partir de uma URL do Instagram.
 *
 * @example
 * const code = extractInstagramShortcode('https://www.instagram.com/reel/C8abc123/?igsh=xyz');
 * // code === 'C8abc123'
 */
export function extractInstagramShortcode(rawUri: string): string | null {
  const match = rawUri.trim().match(INSTAGRAM_SHORTCODE_PATTERN);
  return match && match[1] ? match[1] : null;
}

/**
 * Identifica o provedor de vídeo com base no esquema ou domínio da URI informada.
 *
 * @example
 * const provider = detectVideoProviderKind('https://www.instagram.com/reel/C123/');
 * // provider === 'instagram'
 */
export function detectVideoProviderKind(rawUri: string): VideoProviderKind {
  const normalized = rawUri.trim().toLowerCase();
  if (!normalized) return 'none';
  if (isLocalGalleryUri(normalized)) return 'gallery_file';
  if (extractYoutubeVideoId(rawUri) !== null) return 'youtube';
  if (normalized.includes('instagram.com')) return 'instagram';
  if (normalized.includes('tiktok.com')) return 'tiktok';
  return 'external_url';
}

/**
 * Verifica se a URI aponta para um arquivo de mídia local da galeria do dispositivo.
 *
 * @example
 * const isLocal = isLocalGalleryUri('file:///storage/emulated/0/DCIM/video.mp4');
 * // isLocal === true
 */
export function isLocalGalleryUri(normalizedUri: string): boolean {
  const localPrefixes = ['file://', 'content://', 'ph://', 'assets-library://', 'blob:'];
  return localPrefixes.some((prefix) => normalizedUri.startsWith(prefix));
}

/**
 * Constrói o descritor completo de vídeo (provedor, URL de embed e miniatura).
 *
 * @example
 * const descriptor = classifyRecipeVideoUri('https://youtu.be/dQw4w9WgXcQ');
 * // descriptor.providerKind === 'youtube'
 */
export function classifyRecipeVideoUri(rawUri: string): RecipeVideoDescriptor {
  const cleanedUri = rawUri.trim();
  const providerKind = detectVideoProviderKind(cleanedUri);
  const youtubeId = extractYoutubeVideoId(cleanedUri);
  const instagramCode = extractInstagramShortcode(cleanedUri);
  const globoId = extractGloboplayVideoId(cleanedUri);
  return {
    rawUri: cleanedUri,
    providerKind,
    embedUri: resolveVideoEmbedUri(youtubeId, instagramCode),
    thumbnailUri: resolveVideoThumbnailUri(youtubeId, globoId),
  };
}

function resolveVideoThumbnailUri(
  youtubeId: string | null,
  globoId: string | null,
): string | null {
  if (youtubeId) return `https://img.youtube.com/vi/${youtubeId}/hqdefault.jpg`;
  if (globoId) return `https://s03.video.glbimg.com/x720/${globoId}.jpg`;
  return null;
}

function resolveVideoEmbedUri(
  youtubeId: string | null,
  instagramCode: string | null,
): string | null {
  if (youtubeId) return `https://www.youtube.com/embed/${youtubeId}`;
  if (instagramCode) return `https://www.instagram.com/p/${instagramCode}/embed/`;
  return null;
}

/**
 * Retorna um rótulo amigável em português para o provedor de vídeo identificado.
 *
 * @example
 * const label = formatVideoProviderLabel('tiktok');
 * // label === 'Vídeo do TikTok'
 */
export function formatVideoProviderLabel(providerKind: VideoProviderKind): string {
  const providerLabels: Record<VideoProviderKind, string> = {
    youtube: 'Vídeo do YouTube',
    instagram: 'Reel do Instagram',
    tiktok: 'Vídeo do TikTok',
    gallery_file: 'Vídeo da Galeria (Offline)',
    external_url: 'Link de Vídeo Externo',
    none: 'Sem vídeo cadastrado',
  };
  return providerLabels[providerKind];
}

/**
 * Calcula a altura ideal do iframe embutido: formato vertical para Reels/Shorts e 16:9 para vídeos horizontais.
 *
 * @example
 * const height = resolveEmbeddedPlayerHeight('instagram', 'https://www.instagram.com/reel/C8abc/');
 * // height === 460
 */
export function resolveEmbeddedPlayerHeight(
  providerKind: VideoProviderKind,
  rawUri: string,
): number {
  if (providerKind === 'instagram') {
    return 460;
  }
  if (rawUri.toLowerCase().includes('/shorts/')) {
    return 420;
  }
  return 260;
}
