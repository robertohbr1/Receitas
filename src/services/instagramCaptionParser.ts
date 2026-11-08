import { ParsedRecipeTextResult, RecipeDraftInput } from '../types/recipeTypes';
import { parseFreeformRecipeText, splitIntoNonEmptyLines } from './recipeTextParser';
import { extractInstagramShortcode } from './videoUrlClassifier';
import {
  inferCategoryFromRecipeText,
  isYoutubePromoNoiseLine,
} from './youtubeDescriptionParser';

/**
 * Metadados extraídos de um Reel ou Post de receita no Instagram.
 */
export interface InstagramRemotePostMetadata {
  readonly shortcode: string;
  readonly canonicalPostUrl: string;
  readonly authorUsername: string;
  readonly captionText: string;
  readonly thumbnailUrl: string;
}

/**
 * Extrai a legenda completa, autor e miniatura a partir do HTML público ou de embed do Instagram.
 *
 * @example
 * const meta = extractInstagramMetadataFromHtml('C8abc123', rawEmbedHtml);
 * // meta.shortcode === 'C8abc123'
 */
export function extractInstagramMetadataFromHtml(
  shortcode: string,
  pageHtml: string,
): InstagramRemotePostMetadata {
  if (!shortcode.trim()) {
    throw new Error(
      `Shortcode do Instagram inválido: "${shortcode}". Esperado: código alfanumérico não vazio.`,
    );
  }
  const rawCaption = extractRawCaptionFromInstagramHtml(pageHtml);
  const author = extractInstagramAuthorFromHtml(pageHtml);
  const thumbnail = extractMetaTagContent(pageHtml, 'og:image');
  return {
    shortcode,
    canonicalPostUrl: `https://www.instagram.com/reel/${shortcode}/`,
    authorUsername: author,
    captionText: rawCaption,
    thumbnailUrl: decodeHtmlAttributeEntities(thumbnail),
  };
}

function extractRawCaptionFromInstagramHtml(pageHtml: string): string {
  const embedBlockCaption = extractEmbedCaptionedBody(pageHtml);
  if (embedBlockCaption) {
    return embedBlockCaption;
  }
  const ogDesc = decodeHtmlAttributeEntities(extractMetaTagContent(pageHtml, 'og:description'));
  const cleanedOg = stripInstagramMetaWrapperPrefix(ogDesc);
  if (cleanedOg) {
    return cleanedOg;
  }
  const metaDesc = decodeHtmlAttributeEntities(extractMetaNameContent(pageHtml, 'description'));
  return stripInstagramMetaWrapperPrefix(metaDesc);
}

function extractEmbedCaptionedBody(pageHtml: string): string {
  const captionMatch = pageHtml.match(/class="Caption"[^>]*>([\s\S]*?)<\/div>/i);
  if (!captionMatch || !captionMatch[1]) {
    return '';
  }
  const withoutUsernameLink = captionMatch[1].replace(
    /<a[^>]*class="CaptionUsername"[^>]*>[\s\S]*?<\/a>/i,
    '',
  );
  const withoutComments = withoutUsernameLink.replace(
    /<div[^>]*class="CaptionComments"[\s\S]*$/i,
    '',
  );
  const withLineBreaks = withoutComments.replace(/<br\s*\/?>/gi, '\n');
  const plainText = withLineBreaks.replace(/<[^>]+>/g, '');
  return decodeHtmlAttributeEntities(plainText).trim();
}

function extractMetaTagContent(html: string, propertyName: string): string {
  const regex = new RegExp(
    `<meta[^>]+property=["']${propertyName}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const match = html.match(regex);
  return match && match[1] ? match[1] : '';
}

function extractMetaNameContent(html: string, metaName: string): string {
  const regex = new RegExp(
    `<meta[^>]+name=["']${metaName}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const match = html.match(regex);
  return match && match[1] ? match[1] : '';
}

/**
 * Remove o prefixo padrão de curtidas/data do Instagram ("10K likes, 200 comments - user on Date: \"...\"").
 *
 * @example
 * const clean = stripInstagramMetaWrapperPrefix('500 likes, 10 comments - chef on Jan 1: "Bolo Fácil"');
 * // clean === 'Bolo Fácil'
 */
export function stripInstagramMetaWrapperPrefix(rawMetaDescription: string): string {
  const trimmed = rawMetaDescription.trim();
  if (!trimmed) return '';
  const colonQuoteMatch = trimmed.match(/^[\s\S]*?:\s*["“]([\s\S]+)["”]\.?\s*$/);
  if (colonQuoteMatch && colonQuoteMatch[1]) {
    return colonQuoteMatch[1].trim();
  }
  return trimmed;
}

function extractInstagramAuthorFromHtml(pageHtml: string): string {
  const embedUserMatch = pageHtml.match(/class="CaptionUsername"[^>]*>([^<]+)<\/a>/i);
  if (embedUserMatch && embedUserMatch[1]) {
    return embedUserMatch[1].trim();
  }
  const ogDesc = decodeHtmlAttributeEntities(extractMetaTagContent(pageHtml, 'og:description'));
  const dashUserMatch = ogDesc.match(/-\s*([A-Za-z0-9._]+)\s+(?:on|em|no)\s+/i);
  return dashUserMatch && dashUserMatch[1] ? dashUserMatch[1].trim() : '';
}

/**
 * Decodifica entidades HTML comuns (numéricas, hexadecimais e nomeadas) presentes nas metatags do Instagram.
 *
 * @example
 * const text = decodeHtmlAttributeEntities('P&atilde;o &amp; Queijo &#x1F9C0;');
 */
export function decodeHtmlAttributeEntities(encoded: string): string {
  if (!encoded) return '';
  return encoded
    .replace(/&#x([0-9a-fA-F]+);/g, (_, hex: string) => String.fromCodePoint(parseInt(hex, 16)))
    .replace(/&#(\d+);/g, (_, dec: string) => String.fromCodePoint(parseInt(dec, 10)))
    .replace(/&quot;/g, '"')
    .replace(/&#039;|&apos;/g, "'")
    .replace(/&amp;/g, '&')
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Verifica se uma linha de legenda do Instagram é apenas chamada de engajamento ou hashtags.
 *
 * @example
 * const isNoise = isInstagramPromoNoiseLine('Comente EU QUERO que envio no direct!');
 * // isNoise === true
 */
export function isInstagramPromoNoiseLine(line: string): boolean {
  if (isYoutubePromoNoiseLine(line)) return true;
  const normalized = line.toLowerCase().trim();
  if (/^id:\s*[a-z0-9-]+$/i.test(normalized) || /^tijela$/i.test(normalized)) {
    return true;
  }
  return /(link na bio|comente\s+["']?eu quero|salve ess[ae] receita|marca algu[eé]m|siga\s+@|me segue|no meu perfil|envie para|achados para casa|@mercadolivre|entrega mais r[aá]pido)/.test(
    normalized,
  );
}

/**
 * Limpa linhas promocionais e hashtags da legenda de um Reel/Post do Instagram.
 *
 * @example
 * const clean = stripInstagramPromotionalLines('Bolo de Cenoura\nSiga @chef\n#bolo #receita');
 * // clean === 'Bolo de Cenoura'
 */
export function stripInstagramPromotionalLines(rawCaption: string): string {
  return splitIntoNonEmptyLines(rawCaption)
    .filter((line) => !isInstagramPromoNoiseLine(line))
    .map((line) => line.replace(/#[\wÀ-ÿ-]+/g, '').trim())
    .filter((line) => line.length > 0)
    .join('\n');
}

/**
 * Converte metadados extraídos do Instagram em um rascunho completo RecipeDraftInput.
 *
 * @example
 * const draft = buildRecipeDraftFromInstagramMetadata(instaMeta);
 * // draft.videoSourceUri === instaMeta.canonicalPostUrl
 */
export function buildRecipeDraftFromInstagramMetadata(
  metadata: InstagramRemotePostMetadata,
): RecipeDraftInput {
  const cleanedCaption = stripInstagramPromotionalLines(metadata.captionText);
  const parsed = parseCaptionOrFallback(cleanedCaption, metadata.shortcode);
  const category = inferCategoryFromRecipeText(
    `${parsed.extractedTitle} ${parsed.extractedIngredients.join(' ')}`,
  );
  const authorNote = metadata.authorUsername ? `Instagram: @${metadata.authorUsername}` : '';
  return {
    title: cleanInstagramRecipeTitle(parsed.extractedTitle),
    category,
    coverImageUri: metadata.thumbnailUrl,
    videoSourceUri: metadata.canonicalPostUrl,
    preparationMinutes: parsed.extractedMinutes,
    servingsCount: parsed.extractedServings,
    difficulty: parsed.extractedIngredients.length > 8 ? 'Médio' : 'Fácil',
    ingredients: parsed.extractedIngredients,
    preparationSteps: parsed.extractedSteps,
    unifiedChefNotesAndNutrition: [authorNote, parsed.extractedNotesAndNutrition]
      .filter((part) => part.trim().length > 0)
      .join('\n'),
    tags: ['Instagram', category],
  };
}

function parseCaptionOrFallback(
  cleanedCaption: string,
  shortcode: string,
): ParsedRecipeTextResult {
  if (!cleanedCaption.trim()) {
    return {
      extractedTitle: `Receita do Instagram (${shortcode})`,
      extractedIngredients: ['Confira os ingredientes na legenda ou vídeo do Reel'],
      extractedSteps: ['Assista ao Reel do Instagram acima para acompanhar o preparo.'],
      extractedMinutes: 25,
      extractedServings: 4,
      extractedNotesAndNutrition: '',
    };
  }
  const parsed = parseFreeformRecipeText(cleanedCaption);
  return {
    ...parsed,
    extractedIngredients:
      parsed.extractedIngredients.length > 0
        ? parsed.extractedIngredients
        : ['Confira as quantidades demonstradas no Reel'],
    extractedSteps:
      parsed.extractedSteps.length > 0
        ? parsed.extractedSteps
        : ['Siga o passo a passo demonstrado no vídeo do Instagram.'],
  };
}

function cleanInstagramRecipeTitle(rawTitle: string): string {
  const cleaned = rawTitle
    .replace(/#[\wÀ-ÿ-]+/g, '')
    .replace(/^[@\w.]+\s+on\s+Instagram:\s*/i, '')
    .replace(/^["“]|["”]$/g, '')
    .trim();
  return cleaned.slice(0, 90) || 'Receita do Instagram';
}

/**
 * Verifica se o texto colado é exclusivamente um link válido de Reel ou Post do Instagram.
 *
 * @example
 * const isInsta = isStandaloneInstagramUrl('https://www.instagram.com/reel/C8abc123/');
 * // isInsta === true
 */
export function isStandaloneInstagramUrl(rawInput: string): boolean {
  const trimmed = rawInput.trim();
  if (trimmed.includes('\n') || trimmed.includes(' ')) {
    return false;
  }
  return extractInstagramShortcode(trimmed) !== null;
}
