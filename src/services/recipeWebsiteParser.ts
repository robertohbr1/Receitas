import {
  CulinaryCategory,
  DifficultyLevel,
  RecipeDraftInput,
} from '../types/recipeTypes';
import { decodeHtmlAttributeEntities } from './instagramCaptionParser';
import { extractJsonLdRecipeFromHtml } from './recipeJsonLdParser';
import {
  extractPreparationMinutesFromText,
  extractServingsFromText,
  parseFreeformRecipeText,
} from './recipeTextParser';
import { inferCategoryFromRecipeText } from './youtubeDescriptionParser';

/**
 * Metadados completos extraídos de uma página de site de receitas (ex: Receitas Globo).
 */
export interface RecipeWebsiteExtractedMetadata {
  readonly sourceUrl: string;
  readonly title: string;
  readonly authorName: string;
  readonly programName: string;
  readonly coverImageUrl: string;
  readonly videoUrl: string;
  readonly categoryName: string;
  readonly difficultyLabel: string;
  readonly ingredients: readonly string[];
  readonly preparationSteps: readonly string[];
  readonly preparationMinutes: number;
  readonly servingsCount: number;
}

/**
 * Verifica se o texto informado é um link isolado de site de receita suportado (ex: receitas.globo.com).
 *
 * @example
 * const isSite = isStandaloneRecipeWebsiteUrl('https://receitas.globo.com/receitas-da-tv/e-de-casa/alcatra.ghtml');
 * // isSite === true
 */
const SOCIAL_VIDEO_HOST_PATTERN =
  /^https?:\/\/(?:www\.|m\.|vm\.|vt\.)?(youtube\.com|youtu\.be|instagram\.com|tiktok\.com)(?:\/|$)/i;

const KNOWN_RECIPE_PORTALS_PATTERN =
  /(receitas\.globo\.com|gshow\.globo\.com|tudogostoso\.com\.br|panelinha\.com\.br|cybercook\.com\.br|receitasnestle\.com\.br|tastemade\.com\.br|\.ghtml\b|\/receitas?\/)/i;

/**
 * Verifica se o texto informado é um link isolado de site ou blog culinário (ex: Receitas Globo, TudoGostoso ou páginas com Schema.org Recipe).
 *
 * @example
 * const isSite = isStandaloneRecipeWebsiteUrl('https://receitas.globo.com/receitas-da-tv/e-de-casa/alcatra.ghtml');
 * // isSite === true
 */
export function isStandaloneRecipeWebsiteUrl(rawInput: string): boolean {
  const trimmed = rawInput.trim();
  if (!/^https?:\/\/[^\s/$.?#].[^\s]*$/i.test(trimmed)) {
    return false;
  }
  if (SOCIAL_VIDEO_HOST_PATTERN.test(trimmed)) {
    return false;
  }
  if (KNOWN_RECIPE_PORTALS_PATTERN.test(trimmed)) {
    return true;
  }
  return /^https?:\/\/[^/\s]+\.[^/\s]+\/\S+/i.test(trimmed);
}

/**
 * Extrai título, ingredientes agrupados, modo de preparo, capa e vídeo do HTML de um site de receitas.
 *
 * @example
 * const meta = extractRecipeWebsiteMetadataFromHtml('https://receitas.globo.com/...', rawHtml);
 * // meta.ingredients.length > 0
 */
export function extractRecipeWebsiteMetadataFromHtml(
  sourceUrl: string,
  pageHtml: string,
): RecipeWebsiteExtractedMetadata {
  if (!sourceUrl.trim()) {
    throw new Error(
      `URL do site de receita inválida: "${sourceUrl}". Esperado: URL HTTP/HTTPS não vazia.`,
    );
  }
  const jsonLd = extractJsonLdRecipeFromHtml(pageHtml);
  const microIngredients = extractStructuredWebsiteIngredients(pageHtml);
  const microSteps = extractStructuredWebsiteSteps(pageHtml);
  const ingredients = microIngredients.length > 0 ? microIngredients : (jsonLd?.ingredients ?? []);
  const preparationSteps = microSteps.length > 0 ? microSteps : (jsonLd?.preparationSteps ?? []);
  const stepsText = preparationSteps.join(' ');
  return {
    sourceUrl: sourceUrl.trim(),
    title: extractWebsiteRecipeTitle(pageHtml, jsonLd?.title),
    authorName: extractWebsiteAuthorName(pageHtml) || jsonLd?.authorName || '',
    programName: extractWebsiteProgramName(pageHtml),
    coverImageUrl: extractWebsiteCoverImage(pageHtml) || jsonLd?.coverImageUrl || '',
    videoUrl: extractWebsiteVideoUrl(pageHtml),
    categoryName:
      extractMicrodataMetaContent(pageHtml, 'recipeCategory') || jsonLd?.categoryName || '',
    difficultyLabel: extractWebsiteDifficultyLabel(pageHtml),
    ingredients,
    preparationSteps,
    preparationMinutes: jsonLd?.totalMinutes ?? extractPreparationMinutesFromText(stepsText),
    servingsCount: jsonLd?.servingsCount ?? extractServingsFromText(stepsText),
  };
}

/**
 * Extrai os ingredientes preservando os subtítulos de cada etapa (ex: "Alcatra em tiras", "Molho de queijo").
 *
 * @example
 * const list = extractStructuredWebsiteIngredients(globoHtml);
 * // list[0] === '800 gramas de alcatra em tiras (Alcatra em tiras)'
 */
export function extractStructuredWebsiteIngredients(pageHtml: string): string[] {
  const subtitledGroups = extractSubtitledIngredientGroups(pageHtml);
  if (subtitledGroups.length > 0) {
    return formatIngredientGroups(subtitledGroups);
  }
  return extractMicrodataIngredientItems(pageHtml);
}

function extractSubtitledIngredientGroups(
  pageHtml: string,
): Array<{ subtitle: string; items: string[] }> {
  const pattern =
    /<h2[^>]*class=["'][^"']*content-subtitle__title[^"']*["'][^>]*>([\s\S]*?)<\/h2>[\s\S]*?<ul[^>]*class=["'][^"']*content-unordered-list[^"']*["'][^>]*>([\s\S]*?)<\/ul>/gi;
  const groups: Array<{ subtitle: string; items: string[] }> = [];
  for (const match of pageHtml.matchAll(pattern)) {
    const subtitle = stripHtmlTagsAndTrim(match[1]);
    const items = extractMicrodataIngredientItems(match[2]);
    if (items.length > 0) {
      groups.push({ subtitle, items });
    }
  }
  return groups;
}

function formatIngredientGroups(
  groups: ReadonlyArray<{ subtitle: string; items: string[] }>,
): string[] {
  const hasMultipleGroups = groups.length > 1;
  const formatted: string[] = [];
  for (const group of groups) {
    for (const item of group.items) {
      const label = hasMultipleGroups && group.subtitle ? `${item} (${group.subtitle})` : item;
      formatted.push(label);
    }
  }
  return formatted;
}

function extractMicrodataIngredientItems(htmlFragment: string): string[] {
  const itemPattern = /<li[^>]*itemprop=["']recipeIngredient["'][^>]*>([\s\S]*?)<\/li>/gi;
  const results: string[] = [];
  for (const match of htmlFragment.matchAll(itemPattern)) {
    const cleaned = stripHtmlTagsAndTrim(match[1]);
    if (cleaned) {
      results.push(cleaned);
    }
  }
  return results;
}

/**
 * Extrai os passos do modo de preparo identificando a qual seção da receita cada passo pertence.
 *
 * @example
 * const steps = extractStructuredWebsiteSteps(globoHtml);
 * // steps[0].startsWith('[Alcatra em tiras]') === true
 */
export function extractStructuredWebsiteSteps(pageHtml: string): string[] {
  const subtitledSteps = extractSubtitledInstructionGroups(pageHtml);
  if (subtitledSteps.length > 0) {
    return subtitledSteps;
  }
  return extractMicrodataInstructionItems(pageHtml);
}

function extractSubtitledInstructionGroups(pageHtml: string): string[] {
  const pattern =
    /<h3[^>]*class=["'][^"']*content-subtitle__title[^"']*["'][^>]*>([\s\S]*?)<\/h3>[\s\S]*?<ol[^>]*>([\s\S]*?)<\/ol>/gi;
  const steps: string[] = [];
  for (const match of pageHtml.matchAll(pattern)) {
    const subtitle = stripHtmlTagsAndTrim(match[1]);
    const rawItems = extractMicrodataInstructionItems(match[2]);
    for (const item of rawItems) {
      steps.push(subtitle ? `[${subtitle}] ${item}` : item);
    }
  }
  return steps;
}

function extractMicrodataInstructionItems(htmlFragment: string): string[] {
  const spanPattern =
    /<span[^>]*class=["'][^"']*recipeInstruction__text[^"']*["'][^>]*>([\s\S]*?)<\/span>/gi;
  const spanItems = collectCleanedRegexMatches(htmlFragment, spanPattern);
  if (spanItems.length > 0) {
    return spanItems;
  }
  const liPattern = /<li[^>]*itemprop=["']recipeInstructions["'][^>]*>([\s\S]*?)<\/li>/gi;
  return collectCleanedRegexMatches(htmlFragment, liPattern);
}

function collectCleanedRegexMatches(source: string, pattern: RegExp): string[] {
  const items: string[] = [];
  for (const match of source.matchAll(pattern)) {
    const cleaned = stripHtmlTagsAndTrim(match[1]);
    if (cleaned) {
      items.push(cleaned);
    }
  }
  return items;
}

function extractWebsiteRecipeTitle(pageHtml: string, jsonLdTitle?: string): string {
  const headlineMatch = pageHtml.match(
    /<h1[^>]*itemprop=["']headline["'][^>]*>([\s\S]*?)<\/h1>/i,
  );
  if (headlineMatch && headlineMatch[1]) {
    const headline = stripHtmlTagsAndTrim(headlineMatch[1]);
    if (headline) return headline;
  }
  const ogTitle = extractOpenGraphMetaContent(pageHtml, 'og:title');
  const cleanedOg = ogTitle.replace(/\s*\|\s*Receitas.*$/i, '').trim();
  return cleanedOg || jsonLdTitle || 'Receita Importada da Web';
}

function extractWebsiteAuthorName(pageHtml: string): string {
  const sigMatch = pageHtml.match(
    /class=["'][^"']*recipe-description-labels__signature__content__description[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
  );
  if (sigMatch && sigMatch[1]) {
    return stripHtmlTagsAndTrim(sigMatch[1]);
  }
  return '';
}

function extractWebsiteProgramName(pageHtml: string): string {
  const progMatch = pageHtml.match(
    /class=["'][^"']*recipe-description-labels__signature__content__title[^"']*["'][^>]*>[\s\S]*?<a[^>]*>([\s\S]*?)<\/a>/i,
  );
  if (progMatch && progMatch[1]) {
    return stripHtmlTagsAndTrim(progMatch[1]);
  }
  return '';
}

function extractWebsiteCoverImage(pageHtml: string): string {
  const ogImage = extractOpenGraphMetaContent(pageHtml, 'og:image');
  if (ogImage) {
    return ogImage;
  }
  return extractMicrodataMetaContent(pageHtml, 'thumbnailUrl');
}

function extractWebsiteVideoUrl(pageHtml: string): string {
  return extractMicrodataMetaContent(pageHtml, 'contentUrl');
}

function extractWebsiteDifficultyLabel(pageHtml: string): string {
  const labelMatch = pageHtml.match(
    /<title>\s*Dificuldade de preparo\s*<\/title>[\s\S]*?<span>\s*(Fácil|Médio|Difícil)\s*<\/span>/i,
  );
  return labelMatch && labelMatch[1] ? labelMatch[1].trim() : 'Fácil';
}

function extractOpenGraphMetaContent(pageHtml: string, property: string): string {
  const regex = new RegExp(
    `<meta[^>]+property=["']${property}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const match = pageHtml.match(regex);
  return match && match[1] ? decodeHtmlAttributeEntities(match[1].trim()) : '';
}

function extractMicrodataMetaContent(pageHtml: string, itemprop: string): string {
  const regex = new RegExp(
    `<meta[^>]+itemprop=["']${itemprop}["'][^>]+content=["']([^"']+)["']`,
    'i',
  );
  const match = pageHtml.match(regex);
  return match && match[1] ? decodeHtmlAttributeEntities(match[1].trim()) : '';
}

function stripHtmlTagsAndTrim(rawHtml: string): string {
  const withoutTags = rawHtml.replace(/<[^>]+>/g, ' ');
  return decodeHtmlAttributeEntities(withoutTags).replace(/\s+/g, ' ').trim();
}

/**
 * Converte os metadados extraídos de um site de receitas em um RecipeDraftInput completo.
 *
 * @example
 * const draft = buildRecipeDraftFromWebsiteMetadata(websiteMeta);
 * // draft.category === 'Carnes'
 */
export function buildRecipeDraftFromWebsiteMetadata(
  metadata: RecipeWebsiteExtractedMetadata,
): RecipeDraftInput {
  const resolvedLists = ensureWebsiteIngredientsAndSteps(metadata);
  const category = resolveWebsiteCategory(metadata, resolvedLists.ingredients);
  const difficulty = normalizeDifficultyLevel(metadata.difficultyLabel);
  return {
    title: metadata.title,
    category,
    coverImageUri: metadata.coverImageUrl,
    videoSourceUri: metadata.videoUrl || metadata.sourceUrl,
    originalSourceUrl: metadata.sourceUrl,
    offlineVideoStreamUrl: /\.(mp4|mov|m4v)(\?|$)/i.test(metadata.videoUrl)
      ? metadata.videoUrl
      : undefined,
    preparationMinutes: metadata.preparationMinutes,
    servingsCount: metadata.servingsCount,
    difficulty,
    ingredients: resolvedLists.ingredients,
    preparationSteps: resolvedLists.steps,
    unifiedChefNotesAndNutrition: buildWebsiteChefNotes(metadata),
    tags: buildWebsiteTags(metadata.sourceUrl, metadata.programName, category),
  };
}

function ensureWebsiteIngredientsAndSteps(metadata: RecipeWebsiteExtractedMetadata): {
  ingredients: readonly string[];
  steps: readonly string[];
} {
  if (metadata.ingredients.length > 0 && metadata.preparationSteps.length > 0) {
    return { ingredients: metadata.ingredients, steps: metadata.preparationSteps };
  }
  const fallbackParsed = parseFreeformRecipeText(metadata.title);
  return {
    ingredients:
      metadata.ingredients.length > 0
        ? metadata.ingredients
        : fallbackParsed.extractedIngredients,
    steps:
      metadata.preparationSteps.length > 0
        ? metadata.preparationSteps
        : fallbackParsed.extractedSteps,
  };
}

function resolveWebsiteCategory(
  metadata: RecipeWebsiteExtractedMetadata,
  ingredients: readonly string[],
): Exclude<CulinaryCategory, 'Todas'> {
  const hint = metadata.categoryName.trim();
  const validCategories: ReadonlyArray<Exclude<CulinaryCategory, 'Todas'>> = [
    'Sobremesas',
    'Massas',
    'Carnes',
    'Rápidas',
    'Saudáveis',
    'Lanches',
    'Bebidas',
  ];
  const matchedDirect = validCategories.find(
    (cat) => cat.toLowerCase() === hint.toLowerCase(),
  );
  if (matchedDirect) return matchedDirect;
  return inferCategoryFromRecipeText(`${metadata.title} ${hint} ${ingredients.join(' ')}`);
}

function normalizeDifficultyLevel(rawLabel: string): DifficultyLevel {
  const lower = rawLabel.toLowerCase();
  if (lower.includes('dif')) return 'Difícil';
  if (lower.includes('méd') || lower.includes('med')) return 'Médio';
  return 'Fácil';
}

function buildWebsiteChefNotes(metadata: RecipeWebsiteExtractedMetadata): string {
  const parts: string[] = [];
  if (metadata.programName) parts.push(`Programa: ${metadata.programName}`);
  if (metadata.authorName) parts.push(`Receita por: ${metadata.authorName}`);
  parts.push(`Fonte: ${metadata.sourceUrl}`);
  return parts.join('\n');
}

function buildWebsiteTags(
  sourceUrl: string,
  programName: string,
  category: Exclude<CulinaryCategory, 'Todas'>,
): string[] {
  const siteTag = resolveWebsiteSourceTag(sourceUrl);
  const rawTags = [siteTag, programName, category].filter(
    (item) => item && item.trim().length > 0,
  );
  return Array.from(new Set(rawTags));
}

function resolveWebsiteSourceTag(sourceUrl: string): string {
  const lower = sourceUrl.toLowerCase();
  if (lower.includes('globo.com')) return 'Receitas Globo';
  const hostMatch = lower.match(/^https?:\/\/(?:www\.)?([^/]+)/);
  return hostMatch && hostMatch[1] ? hostMatch[1] : 'Site de Receitas';
}