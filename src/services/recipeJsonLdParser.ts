import { decodeHtmlAttributeEntities } from './instagramCaptionParser';

/**
 * Campos extraídos de um bloco `<script type="application/ld+json">` com `@type: "Recipe"`.
 */
export interface JsonLdRecipeExtractedData {
  readonly title: string;
  readonly authorName: string;
  readonly coverImageUrl: string;
  readonly categoryName: string;
  readonly ingredients: readonly string[];
  readonly preparationSteps: readonly string[];
  readonly totalMinutes: number | null;
  readonly servingsCount: number | null;
}

interface RawJsonLdNode {
  readonly '@type'?: string | readonly string[];
  readonly '@graph'?: readonly RawJsonLdNode[];
  readonly name?: string;
  readonly headline?: string;
  readonly author?: unknown;
  readonly image?: unknown;
  readonly recipeCategory?: unknown;
  readonly recipeIngredient?: readonly unknown[];
  readonly ingredients?: readonly unknown[];
  readonly recipeInstructions?: unknown;
  readonly totalTime?: string;
  readonly prepTime?: string;
  readonly cookTime?: string;
  readonly recipeYield?: unknown;
  readonly itemListElement?: readonly unknown[];
  readonly text?: string;
  readonly url?: string;
}

/**
 * Procura e interpreta um objeto `schema.org/Recipe` dentro de blocos JSON-LD da página HTML.
 *
 * @example
 * const data = extractJsonLdRecipeFromHtml('<script type="application/ld+json">{"@type":"Recipe","name":"Pudim"}</script>');
 * // data?.title === 'Pudim'
 */
export function extractJsonLdRecipeFromHtml(pageHtml: string): JsonLdRecipeExtractedData | null {
  const scriptPattern = /<script[^>]*type=["']application\/ld\+json["'][^>]*>([\s\S]*?)<\/script>/gi;
  for (const match of pageHtml.matchAll(scriptPattern)) {
    const recipeNode = findRecipeNodeInJson(match[1]);
    if (recipeNode) return mapRecipeNodeToExtractedData(recipeNode);
  }
  return null;
}

function findRecipeNodeInJson(rawJsonText: string): RawJsonLdNode | null {
  try {
    const parsed: unknown = JSON.parse(rawJsonText.trim());
    return searchForRecipeNode(parsed);
  } catch {
    return null;
  }
}

function searchForRecipeNode(candidate: unknown): RawJsonLdNode | null {
  if (!candidate || typeof candidate !== 'object') return null;
  if (Array.isArray(candidate)) {
    for (const item of candidate) {
      const found = searchForRecipeNode(item);
      if (found) return found;
    }
    return null;
  }
  const node = candidate as RawJsonLdNode;
  if (isRecipeType(node['@type'])) return node;
  return node['@graph'] ? searchForRecipeNode(node['@graph']) : null;
}

function isRecipeType(rawType: string | readonly string[] | undefined): boolean {
  if (!rawType) return false;
  const list = Array.isArray(rawType) ? rawType : [rawType];
  return list.some((entry) => String(entry).toLowerCase().endsWith('recipe'));
}

function mapRecipeNodeToExtractedData(node: RawJsonLdNode): JsonLdRecipeExtractedData {
  const rawIngredients = node.recipeIngredient ?? node.ingredients ?? [];
  return {
    title: cleanText(node.name ?? node.headline ?? ''),
    authorName: extractAuthorFromJsonLd(node.author),
    coverImageUrl: extractImageFromJsonLd(node.image),
    categoryName: extractFirstString(node.recipeCategory),
    ingredients: rawIngredients.map((item) => cleanText(String(item))).filter(Boolean),
    preparationSteps: flattenJsonLdInstructions(node.recipeInstructions, null),
    totalMinutes: resolveJsonLdTotalMinutes(node),
    servingsCount: parseJsonLdYield(node.recipeYield),
  };
}

function flattenJsonLdInstructions(raw: unknown, sectionName: string | null): string[] {
  if (!raw) return [];
  if (typeof raw === 'string') {
    const text = cleanText(raw);
    return text ? [sectionName ? `[${sectionName}] ${text}` : text] : [];
  }
  if (Array.isArray(raw)) {
    return raw.flatMap((entry) => flattenJsonLdInstructions(entry, sectionName));
  }
  return flattenInstructionObject(raw as RawJsonLdNode, sectionName);
}

function flattenInstructionObject(node: RawJsonLdNode, sectionName: string | null): string[] {
  if (node.itemListElement) {
    const nextSection = cleanText(node.name ?? '') || sectionName;
    return flattenJsonLdInstructions(node.itemListElement, nextSection);
  }
  return flattenJsonLdInstructions(node.text ?? node.name ?? '', sectionName);
}

function resolveJsonLdTotalMinutes(node: RawJsonLdNode): number | null {
  const directTotal = parseIso8601DurationToMinutes(node.totalTime);
  if (directTotal) return directTotal;
  const prep = parseIso8601DurationToMinutes(node.prepTime) ?? 0;
  const cook = parseIso8601DurationToMinutes(node.cookTime) ?? 0;
  return prep + cook > 0 ? prep + cook : null;
}

/**
 * Converte durações ISO-8601 (`PT45M`, `PT1H20M`) em minutos inteiros.
 *
 * @example
 * parseIso8601DurationToMinutes('PT1H15M'); // 75
 */
export function parseIso8601DurationToMinutes(isoDuration: string | undefined): number | null {
  if (!isoDuration) return null;
  const match = isoDuration.match(/P(?:\d+D)?T(?:(\d+)H)?(?:(\d+)M)?(?:(\d+)S)?/i);
  if (!match) return null;
  const hours = Number(match[1] ?? 0);
  const minutes = Number(match[2] ?? 0);
  const total = hours * 60 + minutes;
  return total > 0 ? total : null;
}

function parseJsonLdYield(rawYield: unknown): number | null {
  const text = extractFirstString(rawYield);
  const match = text.match(/(\d{1,3})/);
  return match ? Math.max(1, parseInt(match[1], 10)) : null;
}

function extractAuthorFromJsonLd(rawAuthor: unknown): string {
  if (!rawAuthor) return '';
  if (typeof rawAuthor === 'string') return cleanText(rawAuthor);
  if (Array.isArray(rawAuthor)) return extractAuthorFromJsonLd(rawAuthor[0]);
  return cleanText((rawAuthor as RawJsonLdNode).name ?? '');
}

function extractImageFromJsonLd(rawImage: unknown): string {
  if (!rawImage) return '';
  if (typeof rawImage === 'string') return rawImage.trim();
  if (Array.isArray(rawImage)) return extractImageFromJsonLd(rawImage[0]);
  return ((rawImage as RawJsonLdNode).url ?? '').trim();
}

function extractFirstString(rawValue: unknown): string {
  if (!rawValue) return '';
  if (typeof rawValue === 'string' || typeof rawValue === 'number') return String(rawValue).trim();
  if (Array.isArray(rawValue)) return extractFirstString(rawValue[0]);
  return '';
}

function cleanText(rawText: string): string {
  return decodeHtmlAttributeEntities(rawText.replace(/<[^>]+>/g, ' '))
    .replace(/\s+/g, ' ')
    .trim();
}