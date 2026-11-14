import {
  AiExtractedRecipePayload,
  CulinaryCategory,
  ParsedRecipeTextResult,
  RecipeDraftInput,
} from '../types/recipeTypes';
import {
  extractPreparationMinutesFromText,
  parseFreeformRecipeText,
  splitIntoNonEmptyLines,
} from './recipeTextParser';
import {
  extractSpokenIngredientsFromTranscript,
  extractYoutubeTranscriptFromTimedTextXml,
  splitTranscriptIntoCookingSteps,
} from './recipeTranscriptParser';
import { extractYoutubeVideoId } from './videoUrlClassifier';

export {
  extractYoutubeTranscriptFromTimedTextXml,
  splitTranscriptIntoCookingSteps,
} from './recipeTranscriptParser';

/**
 * Metadados brutos extraídos de uma página de vídeo do YouTube.
 */
export interface YoutubeRemoteVideoMetadata {
  readonly videoId: string;
  readonly canonicalWatchUrl: string;
  readonly title: string;
  readonly descriptionText: string;
  readonly thumbnailUrl: string;
  readonly channelName: string;
  readonly transcriptText?: string;
  readonly aiStructuredRecipe?: AiExtractedRecipePayload | null;
}

interface EmbeddedVideoDetailsShape {
  readonly videoDetails?: {
    readonly title?: string;
    readonly shortDescription?: string;
    readonly author?: string;
  };
}

/**
 * Extrai título, descrição completa ("shortDescription") e canal a partir do HTML de uma página do YouTube.
 *
 * @example
 * const meta = extractYoutubeMetadataFromWatchHtml('eydMbeMvEe8', rawHtmlString);
 * // meta.title === 'PÃO DE QUEIJO COM POLVILHO AZEDO- NÃO MURCHA'
 */
export function extractYoutubeMetadataFromWatchHtml(
  videoId: string,
  watchPageHtml: string,
): YoutubeRemoteVideoMetadata {
  if (!videoId.trim()) {
    throw new Error(
      `ID do vídeo YouTube inválido: "${videoId}". Esperado: string de 11 caracteres.`,
    );
  }
  const details = extractVideoDetailsFromHtml(watchPageHtml);
  const transcriptText = extractYoutubeTranscriptFromTimedTextXml(watchPageHtml);
  return {
    videoId,
    canonicalWatchUrl: `https://www.youtube.com/watch?v=${videoId}`,
    title: cleanYoutubeVideoTitle(details.title || 'Receita do YouTube'),
    descriptionText: details.shortDescription,
    thumbnailUrl: `https://img.youtube.com/vi/${videoId}/hqdefault.jpg`,
    channelName: details.author,
    transcriptText,
  };
}

function extractVideoDetailsFromHtml(watchPageHtml: string): {
  title: string;
  shortDescription: string;
  author: string;
} {
  const embedded = extractBalancedJsonAfterMarker(
    watchPageHtml,
    'var ytInitialPlayerResponse =',
  );
  if (embedded?.videoDetails) {
    return {
      title: embedded.videoDetails.title ?? '',
      shortDescription: embedded.videoDetails.shortDescription ?? '',
      author: embedded.videoDetails.author ?? '',
    };
  }
  return {
    title: extractJsonStringField(watchPageHtml, 'title'),
    shortDescription: extractJsonStringField(watchPageHtml, 'shortDescription'),
    author: extractJsonStringField(watchPageHtml, 'author'),
  };
}

function extractBalancedJsonAfterMarker(
  sourceHtml: string,
  marker: string,
): EmbeddedVideoDetailsShape | null {
  const markerIndex = sourceHtml.indexOf(marker);
  if (markerIndex === -1) return null;
  const openBraceIndex = sourceHtml.indexOf('{', markerIndex);
  if (openBraceIndex === -1) return null;
  const jsonSlice = sliceBalancedBraces(sourceHtml, openBraceIndex);
  if (!jsonSlice) return null;
  try {
    return JSON.parse(jsonSlice) as EmbeddedVideoDetailsShape;
  } catch {
    return null;
  }
}

function sliceBalancedBraces(source: string, startIndex: number): string | null {
  let depth = 0;
  let inString = false;
  let isEscaped = false;
  for (let i = startIndex; i < source.length; i++) {
    const ch = source[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (ch === '\\') {
      isEscaped = true;
      continue;
    }
    if (ch === '"') {
      inString = !inString;
      continue;
    }
    if (!inString && (ch === '{' || ch === '}')) {
      depth += ch === '{' ? 1 : -1;
      if (depth === 0) return source.slice(startIndex, i + 1);
    }
  }
  return null;
}

/**
 * Localiza e decodifica um campo string escapado dentro do JSON embutido da página do YouTube.
 *
 * @example
 * const desc = extractJsonStringField('{"shortDescription":"Linha 1\\nLinha 2"}', 'shortDescription');
 * // desc === 'Linha 1\nLinha 2'
 */
export function extractJsonStringField(
  sourceHtml: string,
  fieldName: string,
): string {
  const keyToken = `"${fieldName}":`;
  const keyIndex = sourceHtml.indexOf(keyToken);
  if (keyIndex === -1) return '';
  const firstQuote = sourceHtml.indexOf('"', keyIndex + keyToken.length);
  if (firstQuote === -1) return '';
  return readEscapedJsonStringAt(sourceHtml, firstQuote + 1);
}

function readEscapedJsonStringAt(source: string, contentStart: number): string {
  let isEscaped = false;
  for (let i = contentStart; i < source.length; i++) {
    const ch = source[i];
    if (isEscaped) {
      isEscaped = false;
      continue;
    }
    if (ch === '\\') {
      isEscaped = true;
      continue;
    }
    if (ch === '"') {
      return decodeJsonEscapedString(source.slice(contentStart, i));
    }
  }
  return '';
}

function decodeJsonEscapedString(escapedContent: string): string {
  try {
    return JSON.parse(`"${escapedContent}"`) as string;
  } catch {
    return escapedContent.replace(/\\n/g, '\n').replace(/\\"/g, '"');
  }
}

/**
 * Remove hashtags e sufixos promocionais comuns de títulos de vídeos de receita no YouTube.
 *
 * @example
 * const clean = cleanYoutubeVideoTitle('PÃO DE QUEIJO #receitas #dicas | FÁCIL - YouTube');
 * // clean === 'PÃO DE QUEIJO'
 */
export function cleanYoutubeVideoTitle(rawTitle: string): string {
  return rawTitle
    .replace(/\s*-\s*YouTube$/i, '')
    .replace(/#[\wÀ-ÿ-]+/g, '')
    .split(/\s+[|•]\s+/)[0]
    .replace(/\s{2,}/g, ' ')
    .trim();
}

/**
 * Filtra linhas de autopromoção, redes sociais e links que costumam poluir descrições do YouTube.
 *
 * @example
 * const cleaned = stripYoutubePromotionalLines('2 ovos\nSE INSCREVA\nhttps://insta.com');
 * // cleaned === '2 ovos'
 */
export function stripYoutubePromotionalLines(rawDescription: string): string {
  const lines = splitIntoNonEmptyLines(rawDescription);
  const relevantLines = lines.filter((line) => !isYoutubePromoNoiseLine(line));
  return relevantLines.join('\n');
}

/**
 * Verifica se uma linha da descrição do YouTube é apenas ruído de redes sociais, cursos ou saudação.
 *
 * @example
 * const isNoise = isYoutubePromoNoiseLine('DEIXA SEU LIKE 👍');
 * // isNoise === true
 */
export function isYoutubePromoNoiseLine(line: string): boolean {
  const normalized = line.toLowerCase().trim();
  if (/https?:\/\//.test(normalized) || /^#[\wÀ-ÿ]+/.test(normalized)) {
    return true;
  }
  return /(inscreva-se|se inscreva|deix[ae] seu like|deix[ae] o like|ative o sininho|me siga|redes sociais|contato comercial|parcerias|cupom|link do curso|hotmart|deus aben[cç]oe|compartilhe esse v[ií]deo)/.test(
    normalized,
  );
}

/**
 * Infere a categoria gastronômica mais adequada com base no título e ingredientes extraídos.
 *
 * @example
 * const category = inferCategoryFromRecipeText('Bolo de Chocolate com Morango');
 * // category === 'Sobremesas'
 */
export function inferCategoryFromRecipeText(
  combinedText: string,
): Exclude<CulinaryCategory, 'Todas'> {
  const text = combinedText.toLowerCase();
  if (/(bolo|brigadeiro|pudim|torta doce|mousse|sorvete|picol[eé]|cookie|sobremesa|doce|chocolate|leite condensado)/.test(text)) {
    return 'Sobremesas';
  }
  if (/(p[aã]o de queijo|sandu[ií]che|lanche|pastel|coxinha|empada|tapioca|crepioca)/.test(text)) {
    return 'Lanches';
  }
  if (/(macarr[aã]o|lasanha|nhoque|risoto|espaguete|massa|pizza|p[aã]o)/.test(text)) {
    return 'Massas';
  }
  if (/(carne|frango|bife|churrasco|costela|porco|peixe|salm[aã]o|camar[aã]o)/.test(text)) {
    return 'Carnes';
  }
  if (/(salada|fit|light|vegano|integral|detox|legumes|aveia)/.test(text)) {
    return 'Saudáveis';
  }
  return 'Rápidas';
}

/**
 * Transforma os metadados extraídos do YouTube em um resultado estruturado de receita.
 *
 * @example
 * const parsed = parseYoutubeMetadataIntoRecipe(youtubeMeta);
 * // parsed.extractedTitle === youtubeMeta.title
 */
export function parseYoutubeMetadataIntoRecipe(
  metadata: YoutubeRemoteVideoMetadata,
): ParsedRecipeTextResult {
  const cleanedDescription = stripYoutubePromotionalLines(metadata.descriptionText);
  const deduplicatedLines = removeDuplicateTitleLines(metadata.title, cleanedDescription);
  const combinedSource = `${metadata.title}\n${deduplicatedLines}`;
  const parsed = parseFreeformRecipeText(combinedSource);
  return ensureNonEmptyRecipeSections(parsed, metadata);
}

function removeDuplicateTitleLines(title: string, description: string): string {
  const normTitle = title.toLowerCase().slice(0, 18);
  return splitIntoNonEmptyLines(description)
    .filter((line) => {
      const lower = line.toLowerCase();
      if (normTitle && lower.includes(normTitle)) return false;
      if (/^receita f[aá]cil de\b/i.test(lower)) return false;
      return true;
    })
    .join('\n');
}

function ensureNonEmptyRecipeSections(
  parsed: ParsedRecipeTextResult,
  metadata: YoutubeRemoteVideoMetadata,
): ParsedRecipeTextResult {
  const transcript = (metadata.transcriptText ?? '').trim();
  const fallbackIngredients = resolveYoutubeIngredientsWithTranscript(
    parsed.extractedIngredients,
    transcript,
  );
  const fallbackSteps = resolveStepsWithTranscriptFallback(parsed.extractedSteps, transcript);
  const extractedMinutes =
    parsed.extractedMinutes === 30 && transcript
      ? extractPreparationMinutesFromText(transcript)
      : parsed.extractedMinutes;
  return {
    ...parsed,
    extractedTitle: metadata.title || parsed.extractedTitle,
    extractedIngredients: fallbackIngredients,
    extractedSteps: fallbackSteps,
    extractedMinutes,
    extractedNotesAndNutrition: composeYoutubeNotesAndTranscript(metadata, parsed, transcript),
  };
}

function resolveYoutubeIngredientsWithTranscript(
  extractedIngredients: readonly string[],
  transcript: string,
): readonly string[] {
  if (extractedIngredients.length > 0) return extractedIngredients;
  const spoken = extractSpokenIngredientsFromTranscript(transcript);
  return spoken.length > 0 ? spoken : ['Confira as quantidades exatas demonstradas no vídeo'];
}

function composeYoutubeNotesAndTranscript(
  metadata: YoutubeRemoteVideoMetadata,
  parsed: ParsedRecipeTextResult,
  transcript: string,
): string {
  const channelNote = metadata.channelName ? `Canal do YouTube: ${metadata.channelName}` : '';
  const transcriptNote = transcript ? `🎙️ Transcrição Completa do Vídeo:\n${transcript}` : '';
  return [channelNote, parsed.extractedNotesAndNutrition, transcriptNote]
    .filter((part) => part.trim().length > 0)
    .join('\n\n');
}

function resolveStepsWithTranscriptFallback(
  extractedSteps: readonly string[],
  transcript: string,
): readonly string[] {
  if (extractedSteps.length > 0) {
    return extractedSteps;
  }
  const transcriptSteps = splitTranscriptIntoCookingSteps(transcript);
  if (transcriptSteps.length > 0) {
    return transcriptSteps;
  }
  return ['Assista ao passo a passo no vídeo acima e siga a ordem de preparo indicada.'];
}

/**
 * Converte metadados de um vídeo do YouTube diretamente em um rascunho completo pronto para salvar.
 *
 * @example
 * const draft = buildRecipeDraftFromYoutubeMetadata(youtubeMetadata);
 * // draft.videoSourceUri === youtubeMetadata.canonicalWatchUrl
 */
export function buildRecipeDraftFromYoutubeMetadata(
  metadata: YoutubeRemoteVideoMetadata,
): RecipeDraftInput {
  const aiPayload = metadata.aiStructuredRecipe ?? null;
  const parsed = mergeYoutubeParsedWithAi(
    parseYoutubeMetadataIntoRecipe(metadata),
    aiPayload,
    metadata,
  );
  const category = inferCategoryFromRecipeText(
    `${parsed.extractedTitle} ${parsed.extractedIngredients.join(' ')}`,
  );
  const fullTranscript =
    (metadata.transcriptText ?? '').trim() || (aiPayload?.notesAndTranscript ?? '').trim();
  return {
    title: parsed.extractedTitle,
    category,
    coverImageUri: metadata.thumbnailUrl,
    videoSourceUri: metadata.canonicalWatchUrl,
    originalSourceUrl: metadata.canonicalWatchUrl,
    preparationMinutes: parsed.extractedMinutes,
    servingsCount: parsed.extractedServings,
    difficulty: parsed.extractedIngredients.length > 8 ? 'Médio' : 'Fácil',
    ingredients: parsed.extractedIngredients,
    preparationSteps: parsed.extractedSteps,
    unifiedChefNotesAndNutrition: parsed.extractedNotesAndNutrition,
    videoTranscriptText: fullTranscript || undefined,
    tags: ['YouTube', category],
  };
}

function mergeYoutubeParsedWithAi(
  parsed: ParsedRecipeTextResult,
  aiPayload: AiExtractedRecipePayload | null,
  metadata: YoutubeRemoteVideoMetadata,
): ParsedRecipeTextResult {
  if (!aiPayload) return parsed;
  const hasRealIngredients = !parsed.extractedIngredients[0]?.startsWith('Confira ');
  const hasRealSteps = !parsed.extractedSteps[0]?.startsWith('Assista ao passo a passo');
  const aiNotes = aiPayload.notesAndTranscript.trim();
  const extraTranscript =
    aiNotes && !metadata.transcriptText ? `🎙️ Transcrição Completa do Vídeo:\n${aiNotes}` : '';
  const combinedNotes = [parsed.extractedNotesAndNutrition, extraTranscript]
    .filter((item) => item.trim().length > 0)
    .join('\n\n');
  return {
    extractedTitle:
      aiPayload.title && (!metadata.title.trim() || metadata.title === 'Receita do YouTube')
        ? aiPayload.title
        : parsed.extractedTitle,
    extractedIngredients:
      !hasRealIngredients && aiPayload.ingredients.length > 0
        ? aiPayload.ingredients
        : parsed.extractedIngredients,
    extractedSteps:
      !hasRealSteps && aiPayload.preparationSteps.length > 0
        ? aiPayload.preparationSteps
        : parsed.extractedSteps,
    extractedMinutes: aiPayload.preparationMinutes ?? parsed.extractedMinutes,
    extractedServings: aiPayload.servingsCount ?? parsed.extractedServings,
    extractedNotesAndNutrition: combinedNotes,
  };
}

/**
 * Verifica se um texto informado consiste apenas em um link de vídeo do YouTube.
 *
 * @example
 * const isSingleUrl = isStandaloneYoutubeUrl('https://www.youtube.com/shorts/eydMbeMvEe8');
 * // isSingleUrl === true
 */
export function isStandaloneYoutubeUrl(rawInput: string): boolean {
  const trimmed = rawInput.trim();
  if (trimmed.includes('\n') || trimmed.includes(' ')) {
    return false;
  }
  return extractYoutubeVideoId(trimmed) !== null;
}