import {
  extractInstagramShortcode,
  extractYoutubeVideoId,
} from '../services/videoUrlClassifier';
import {
  buildRecipeDraftFromInstagramMetadata,
  extractInstagramMetadataFromHtml,
  InstagramRemotePostMetadata,
  isStandaloneInstagramUrl,
} from '../services/instagramCaptionParser';
import {
  buildRecipeDraftFromYoutubeMetadata,
  extractYoutubeMetadataFromWatchHtml,
  isStandaloneYoutubeUrl,
  YoutubeRemoteVideoMetadata,
} from '../services/youtubeDescriptionParser';
import { RecipeDraftInput } from '../types/recipeTypes';

/**
 * Interface proprietária para buscar receitas do YouTube e do Instagram por link.
 */
export interface YoutubeVideoMetadataGateway {
  fetchVideoMetadataByUrl(youtubeUrl: string): Promise<YoutubeRemoteVideoMetadata>;
  fetchSocialRecipeDraftByUrl?(socialUrl: string): Promise<RecipeDraftInput>;
}

/**
 * Verifica se a URL informada é um link isolado suportado para importação automática (YouTube ou Instagram).
 *
 * @example
 * const supported = isStandaloneSupportedVideoUrl('https://www.instagram.com/reel/C8abc123/');
 * // supported === true
 */
export function isStandaloneSupportedVideoUrl(rawInput: string): boolean {
  return isStandaloneYoutubeUrl(rawInput) || isStandaloneInstagramUrl(rawInput);
}

/**
 * Resolve e converte qualquer URL suportada (YouTube ou Instagram) em um RecipeDraftInput completo.
 *
 * @example
 * const draft = await resolveSocialRecipeDraftFromUrl('https://youtu.be/eydMbeMvEe8', gateway);
 */
export async function resolveSocialRecipeDraftFromUrl(
  socialUrl: string,
  gateway: YoutubeVideoMetadataGateway,
): Promise<RecipeDraftInput> {
  if (gateway.fetchSocialRecipeDraftByUrl) {
    return gateway.fetchSocialRecipeDraftByUrl(socialUrl);
  }
  const youtubeMeta = await gateway.fetchVideoMetadataByUrl(socialUrl);
  return buildRecipeDraftFromYoutubeMetadata(youtubeMeta);
}

/**
 * Implementação resiliente que busca os dados de páginas do YouTube e Instagram com suporte a Web (CORS) e mobile.
 */
export class PublicWebYoutubeMetadataGateway implements YoutubeVideoMetadataGateway {
  /**
   * Obtém título, descrição completa (ingredientes/preparo) e miniatura a partir de um link do YouTube.
   *
   * @example
   * const meta = await gateway.fetchVideoMetadataByUrl('https://www.youtube.com/shorts/eydMbeMvEe8');
   */
  public async fetchVideoMetadataByUrl(
    youtubeUrl: string,
  ): Promise<YoutubeRemoteVideoMetadata> {
    const videoId = extractYoutubeVideoId(youtubeUrl);
    if (!videoId) {
      throw new Error(
        `Link do YouTube inválido: "${youtubeUrl}". Esperado: URL contendo watch?v=, youtu.be/ ou shorts/.`,
      );
    }
    const watchHtml = await fetchYoutubeWatchHtmlWithFallbacks(videoId);
    if (watchHtml.includes('"shortDescription"')) {
      return extractYoutubeMetadataFromWatchHtml(videoId, watchHtml);
    }
    return fetchNoembedFallbackMetadata(videoId);
  }

  /**
   * Detecta automaticamente se o link é do YouTube ou Instagram e retorna o rascunho completo da receita.
   *
   * @example
   * const draft = await gateway.fetchSocialRecipeDraftByUrl('https://www.instagram.com/reel/C8abc123/');
   */
  public async fetchSocialRecipeDraftByUrl(socialUrl: string): Promise<RecipeDraftInput> {
    const instagramCode = extractInstagramShortcode(socialUrl);
    if (instagramCode) {
      const instaMeta = await fetchInstagramMetadataWithFallbacks(instagramCode);
      return buildRecipeDraftFromInstagramMetadata(instaMeta);
    }
    const youtubeMeta = await this.fetchVideoMetadataByUrl(socialUrl);
    return buildRecipeDraftFromYoutubeMetadata(youtubeMeta);
  }
}

async function fetchYoutubeWatchHtmlWithFallbacks(videoId: string): Promise<string> {
  const targetWatchUrl = `https://www.youtube.com/watch?v=${videoId}&hl=pt`;
  const directEndpoints = [
    `/api/youtube-watch?videoId=${encodeURIComponent(videoId)}`,
    targetWatchUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetWatchUrl)}`,
  ];
  for (const endpoint of directEndpoints) {
    const html = await tryFetchTextFromEndpoint(endpoint);
    if (html && html.includes('shortDescription')) {
      return html;
    }
  }
  return tryFetchAllOriginsJsonWrapper(targetWatchUrl);
}

async function tryFetchAllOriginsJsonWrapper(targetWatchUrl: string): Promise<string> {
  const wrapperUrl = `https://api.allorigins.win/get?url=${encodeURIComponent(targetWatchUrl)}`;
  const rawJson = await tryFetchTextFromEndpoint(wrapperUrl);
  if (!rawJson) return '';
  try {
    const parsed = JSON.parse(rawJson) as { contents?: string };
    return parsed.contents ?? '';
  } catch {
    return '';
  }
}

async function tryFetchTextFromEndpoint(endpointUrl: string): Promise<string | null> {
  try {
    const response = await fetch(endpointUrl);
    if (!response.ok) {
      return null;
    }
    return await response.text();
  } catch {
    return null;
  }
}

async function fetchNoembedFallbackMetadata(
  videoId: string,
): Promise<YoutubeRemoteVideoMetadata> {
  const canonicalWatchUrl = `https://www.youtube.com/watch?v=${videoId}`;
  const noembedUrl = `https://noembed.com/embed?url=${encodeURIComponent(canonicalWatchUrl)}`;
  const rawJson = await tryFetchTextFromEndpoint(noembedUrl);
  const parsed = parseNoembedJson(rawJson);
  return {
    videoId,
    canonicalWatchUrl,
    title: parsed.title || 'Receita do YouTube',
    descriptionText: '',
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    channelName: parsed.authorName,
  };
}

function parseNoembedJson(rawJson: string | null): {
  title: string;
  authorName: string;
} {
  if (!rawJson) {
    return { title: '', authorName: '' };
  }
  try {
    const obj = JSON.parse(rawJson) as { title?: string; author_name?: string };
    return { title: obj.title ?? '', authorName: obj.author_name ?? '' };
  } catch {
    return { title: '', authorName: '' };
  }
}

async function fetchInstagramMetadataWithFallbacks(
  shortcode: string,
): Promise<InstagramRemotePostMetadata> {
  const postTarget = `https://www.instagram.com/p/${shortcode}/`;
  const embedTarget = `https://www.instagram.com/p/${shortcode}/embed/captioned/`;
  const crawlerHtml = await tryFetchWithCrawlerHeader(postTarget);
  if (crawlerHtml && crawlerHtml.includes('og:description')) {
    return extractInstagramMetadataFromHtml(shortcode, crawlerHtml);
  }
  const endpoints = [
    `/api/instagram-post?shortcode=${encodeURIComponent(shortcode)}`,
    embedTarget,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(embedTarget)}`,
  ];
  for (const endpoint of endpoints) {
    const html = await tryFetchTextFromEndpoint(endpoint);
    if (html && (html.includes('Caption') || html.includes('og:description'))) {
      return extractInstagramMetadataFromHtml(shortcode, html);
    }
  }
  return extractInstagramMetadataFromHtml(shortcode, '');
}

async function tryFetchWithCrawlerHeader(targetUrl: string): Promise<string | null> {
  try {
    const response = await fetch(targetUrl, {
      headers: {
        'User-Agent': 'facebookexternalhit/1.1 (+http://www.facebook.com/externalhit_uatext.php)',
        'Accept-Language': 'pt-BR,pt;q=0.9',
      },
    });
    if (!response.ok) return null;
    return await response.text();
  } catch {
    return null;
  }
}
