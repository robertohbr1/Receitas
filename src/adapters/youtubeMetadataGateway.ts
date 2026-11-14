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
  buildRecipeDraftFromWebsiteMetadata,
  extractRecipeWebsiteMetadataFromHtml,
  isStandaloneRecipeWebsiteUrl,
} from '../services/recipeWebsiteParser';
import {
  buildRecipeDraftFromYoutubeMetadata,
  extractYoutubeMetadataFromWatchHtml,
  isStandaloneYoutubeUrl,
  parseYoutubeMetadataIntoRecipe,
  YoutubeRemoteVideoMetadata,
} from '../services/youtubeDescriptionParser';
import { hasPlaceholderRecipeContent } from '../services/recipeTranscriptParser';
import { RecipeDraftInput } from '../types/recipeTypes';
import { AiVideoTranscriptionGateway } from './aiVideoTranscriptionGateway';

/**
 * Interface proprietária para buscar receitas do YouTube, Instagram e sites culinários por link.
 */
export interface YoutubeVideoMetadataGateway {
  fetchVideoMetadataByUrl(youtubeUrl: string): Promise<YoutubeRemoteVideoMetadata>;
  fetchSocialRecipeDraftByUrl?(socialUrl: string): Promise<RecipeDraftInput>;
}

/**
 * Verifica se a URL informada é um link isolado suportado para importação automática (YouTube, Instagram ou Receitas Globo).
 *
 * @example
 * const supported = isStandaloneSupportedVideoUrl('https://www.instagram.com/reel/C8abc123/');
 * // supported === true
 */
export function isStandaloneSupportedVideoUrl(rawInput: string): boolean {
  return (
    isStandaloneYoutubeUrl(rawInput) ||
    isStandaloneInstagramUrl(rawInput) ||
    isStandaloneRecipeWebsiteUrl(rawInput)
  );
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
  private readonly aiTranscriptionGateway?: AiVideoTranscriptionGateway;

  public constructor(aiTranscriptionGateway?: AiVideoTranscriptionGateway) {
    this.aiTranscriptionGateway = aiTranscriptionGateway;
  }

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
    const baseMeta = watchHtml.includes('"shortDescription"')
      ? extractYoutubeMetadataFromWatchHtml(
          videoId,
          await appendYoutubeTranscriptIfMissing(videoId, watchHtml),
        )
      : await fetchNoembedFallbackMetadata(videoId);
    return enrichYoutubeWithStructuredAi(baseMeta, this.aiTranscriptionGateway);
  }

  /**
   * Detecta automaticamente se o link é do YouTube, Instagram ou site de receitas e retorna o rascunho completo.
   *
   * @example
   * const draft = await gateway.fetchSocialRecipeDraftByUrl('https://www.instagram.com/reel/C8abc123/');
   */
  public async fetchSocialRecipeDraftByUrl(socialUrl: string): Promise<RecipeDraftInput> {
    const instagramCode = extractInstagramShortcode(socialUrl);
    if (instagramCode) {
      const instaMeta = await fetchInstagramMetadataWithFallbacks(
        instagramCode,
        this.aiTranscriptionGateway,
      );
      return buildRecipeDraftFromInstagramMetadata(instaMeta);
    }
    if (isStandaloneRecipeWebsiteUrl(socialUrl)) {
      const siteHtml = await fetchWebsiteHtmlWithFallbacks(socialUrl.trim());
      const siteMeta = extractRecipeWebsiteMetadataFromHtml(socialUrl, siteHtml);
      if (siteMeta.ingredients.length === 0 && siteMeta.preparationSteps.length === 0) {
        throw new Error(
          `Nenhuma receita estruturada encontrada em "${socialUrl}". Esperado: página com Schema.org Recipe ou lista de ingredientes.`,
        );
      }
      return buildRecipeDraftFromWebsiteMetadata(siteMeta);
    }
    const youtubeMeta = await this.fetchVideoMetadataByUrl(socialUrl);
    return buildRecipeDraftFromYoutubeMetadata(youtubeMeta);
  }
}

async function fetchWebsiteHtmlWithFallbacks(targetUrl: string): Promise<string> {
  const endpoints = [
    `/api/recipe-webpage?url=${encodeURIComponent(targetUrl)}`,
    targetUrl,
    `https://api.allorigins.win/raw?url=${encodeURIComponent(targetUrl)}`,
  ];
  for (const endpoint of endpoints) {
    const html = await tryFetchTextFromEndpoint(endpoint);
    if (html && (html.includes('recipeIngredient') || html.includes('og:title'))) {
      return html;
    }
  }
  return tryFetchAllOriginsJsonWrapper(targetUrl);
}

async function appendYoutubeTranscriptIfMissing(
  videoId: string,
  watchHtml: string,
): Promise<string> {
  if (watchHtml.includes('<transcript>')) {
    return watchHtml;
  }
  const transcriptXml = await fetchYoutubeTimedTextXmlDirect(videoId);
  return transcriptXml ? `${watchHtml}\n${transcriptXml}` : watchHtml;
}

interface InnertubePlayerCaptionsResponse {
  readonly captions?: {
    readonly playerCaptionsTracklistRenderer?: {
      readonly captionTracks?: ReadonlyArray<{
        readonly baseUrl?: string;
        readonly languageCode?: string;
      }>;
    };
  };
}

async function fetchYoutubeTimedTextXmlDirect(videoId: string): Promise<string> {
  try {
    const response = await fetch('https://www.youtube.com/youtubei/v1/player?prettyPrint=false', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(buildIosInnertubePayload(videoId)),
    });
    if (!response.ok) return '';
    const data = (await response.json()) as InnertubePlayerCaptionsResponse;
    const tracks = data.captions?.playerCaptionsTracklistRenderer?.captionTracks ?? [];
    const chosen = tracks.find((t) => t.languageCode?.startsWith('pt')) ?? tracks[0];
    return chosen?.baseUrl ? (await tryFetchTextFromEndpoint(chosen.baseUrl)) ?? '' : '';
  } catch {
    return '';
  }
}

function buildIosInnertubePayload(videoId: string): Record<string, unknown> {
  return {
    videoId,
    context: {
      client: {
        clientName: 'IOS',
        clientVersion: '20.03.02',
        deviceMake: 'Apple',
        deviceModel: 'iPhone16,2',
        osName: 'iPhone',
        osVersion: '18.2.1.22C161',
        hl: 'pt',
        gl: 'BR',
      },
    },
  };
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

async function enrichYoutubeWithStructuredAi(
  baseMeta: YoutubeRemoteVideoMetadata,
  aiGateway?: AiVideoTranscriptionGateway,
): Promise<YoutubeRemoteVideoMetadata> {
  if (!aiGateway?.extractStructuredRecipeIfConfigured) {
    return baseMeta;
  }
  const preliminaryParsed = parseYoutubeMetadataIntoRecipe(baseMeta);
  const isCompleteWithoutAi =
    !hasPlaceholderRecipeContent(
      preliminaryParsed.extractedIngredients,
      preliminaryParsed.extractedSteps,
    ) && (baseMeta.transcriptText ?? '').trim().length > 20;
  if (isCompleteWithoutAi) {
    return baseMeta;
  }
  const aiStructuredRecipe = await aiGateway.extractStructuredRecipeIfConfigured({
    sourceUrl: baseMeta.canonicalWatchUrl,
    videoStreamUrl: '',
    existingCaptionText: `${baseMeta.title}\n${baseMeta.descriptionText}`,
  });
  return aiStructuredRecipe ? { ...baseMeta, aiStructuredRecipe } : baseMeta;
}

async function fetchInstagramMetadataWithFallbacks(
  shortcode: string,
  aiTranscriptionGateway?: AiVideoTranscriptionGateway,
): Promise<InstagramRemotePostMetadata> {
  const baseMeta = await fetchRawInstagramMetadata(shortcode);
  if (!aiTranscriptionGateway) {
    return baseMeta;
  }
  const request = {
    sourceUrl: baseMeta.canonicalPostUrl,
    videoStreamUrl: baseMeta.videoStreamUrl ?? '',
    existingCaptionText: baseMeta.captionText,
  };
  const aiStructuredRecipe = aiTranscriptionGateway.extractStructuredRecipeIfConfigured
    ? await aiTranscriptionGateway.extractStructuredRecipeIfConfigured(request)
    : null;
  if (aiStructuredRecipe) {
    return {
      ...baseMeta,
      aiStructuredRecipe,
      transcriptText: aiStructuredRecipe.notesAndTranscript || undefined,
    };
  }
  const transcriptText = await aiTranscriptionGateway.transcribeVideoIfConfigured(request);
  return transcriptText ? { ...baseMeta, transcriptText } : baseMeta;
}

async function fetchRawInstagramMetadata(
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
