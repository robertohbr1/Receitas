import { ParsedRecipeTextResult } from '../types/recipeTypes';
import {
  extractPreparationMinutesFromText,
  extractServingsFromText,
  parseFreeformRecipeText,
  splitIntoNonEmptyLines,
} from './recipeTextParser';

const SPOKEN_TRANSITION_SPLIT_PATTERN =
  /(?:[.!?]+\s+|\b(?=agora\s+(?:voc[eê]|depois|nesse|sim|[eé]\s+m[aã]o|adicione|acrescente|coloque|misture|leve|bata|vamos)|depois\s+(?:de\s+frio|voc[eê]|adicione|acrescente|coloque|misture|leve)|em\s+seguida|logo\s+ap[oó]s|na\s+sequ[eê]ncia|feito\s+isso|por\s+[uú]ltimo|por\s+fim|para\s+finalizar|enquanto\s+isso))/i;

const SPOKEN_QTY_TOKEN =
  '(?:\\d+(?:[.,/]\\d+)?|um\\s+quarto|tr[eê]s\\s+quartos|meia|meio|uma|um|duas|dois|tr[eê]s|quatro|cinco|seis)';

const SPOKEN_UNIT_TOKEN =
  '(?:g|gr|gramas?|kg|quilos?|ml|litros?|x[ií]caras?(?:\\s+de\\s+(?:ch[aá]|caf[eé]))?|colher(?:es)?(?:\\s+de\\s+(?:sopa|ch[aá]|sobremesa|caf[eé]))?|pitadas?|dentes?|latas?|caixinhas?|pacotes?| sach[eê]s?|tabletes?|folhas?|ramos?|fatias?|rodelas?|unidades?)';

const SPOKEN_MEASURED_INGREDIENT_PATTERN = new RegExp(
  `\\b(${SPOKEN_QTY_TOKEN}\\s*${SPOKEN_UNIT_TOKEN}\\s+de\\s+[a-zà-ÿ]+(?:\\s+(?!e\\s+(?:\\d|um|uma|duas|dois|tr[eê]s|meia|meio|mistur|bat|lev|assar|ferv|coloc|adicion)|para\\b|no\\b|na\\b|em\\s+(?!(?:p[oó]|cubos?|tiras?|rodelas?|fatias?|flocos?|lascas?|conserva|temperatura)(?![a-zà-ÿ]))|por\\b|at[eé](?![a-zà-ÿ])|agora\\b|depois\\b)[a-zà-ÿ-]+){0,4})`,
  'gi',
);

const SPOKEN_COUNTED_INGREDIENT_PATTERN = new RegExp(
  `\\b(${SPOKEN_QTY_TOKEN}\\s+(?:ovos?|cebolas?|cenouras?|bananas?|lim[oõ]es?|tomates?|batatas?|alhos?|gemas?|claras?|ma[cç][aã]s?|laranjas?|abobrinhas?|berinjelas?|piment[oõ]es?)(?:\\s+(?:inteiros?|inteiras?|m[eé]di[ao]s?|grandes?|pequen[ao]s?|picad[ao]s?|ralad[ao]s?|amassad[ao]s?))?)`,
  'gi',
);

const SPOKEN_UNMEASURED_STAPLE_PATTERN =
  /\b((?:sal(?:\s+e\s+pimenta(?:-do-reino)?)?|pimenta(?:-do-reino)?|cheiro-verde|salsinha|cebolinha|or[eé]gano|noz-moscada|canela|azeite)\s+(?:a\s+gosto|para\s+(?:untar|refogar|finalizar|polvilhar)))\b/gi;

const PLACEHOLDER_PREFIX_PATTERN =
  /^(?:confira\s+(?:as\s+quantidades|os\s+ingredientes)|assista\s+ao\s+(?:passo\s+a\s+passo|reel|v[ií]deo)|siga\s+o\s+passo\s+a\s+passo)/i;

const SPOKEN_CHATTER_NOISE_PATTERN =
  /^(?:oi\s+gente|ol[aá]\s+pessoal|tudo\s+bem\s+com\s+voc[eê]s|bem-vindos\s+ao|se\s+inscreva|deixe\s+seu\s+like|comente\s+aqui)/i;

const TRANSCRIPT_MARKER_PATTERN =
  /🎙️\s*Transcri[cç][aã]o\s+Completa\s+do\s+V[ií]deo:\s*\n([\s\S]+?)(?=\n\n📝\s*Texto\s+Completo|\n\nFonte:|$)/i;

/**
 * Extrai e concatena os segmentos de fala (`<text start="..." dur="...">`) do XML de legendas do YouTube.
 *
 * @example
 * const transcript = extractYoutubeTranscriptFromTimedTextXml('<transcript><text start="0">Misture bem</text></transcript>');
 * // transcript === 'Misture bem'
 */
export function extractYoutubeTranscriptFromTimedTextXml(sourceHtmlOrXml: string): string {
  const transcriptBlockMatch = sourceHtmlOrXml.match(/<transcript>([\s\S]*?)<\/transcript>/i);
  const xmlBody = transcriptBlockMatch ? transcriptBlockMatch[1] : sourceHtmlOrXml;
  const textTagPattern = /<text[^>]*>([\s\S]*?)<\/text>/gi;
  const phrases: string[] = [];
  for (const match of xmlBody.matchAll(textTagPattern)) {
    const cleaned = decodeTranscriptXmlEntities(match[1]).replace(/\s+/g, ' ').trim();
    if (cleaned) phrases.push(cleaned);
  }
  return phrases.join(' ');
}

function decodeTranscriptXmlEntities(rawText: string): string {
  return rawText
    .replace(/&amp;/g, '&')
    .replace(/&quot;/g, '"')
    .replace(/&#39;|&apos;/g, "'")
    .replace(/&lt;/g, '<')
    .replace(/&gt;/g, '>');
}

/**
 * Divide uma transcrição contínua de áudio culinário em frases de preparo legíveis.
 *
 * @example
 * const steps = splitTranscriptIntoCookingSteps('misture bem agora você vai ferver o leite');
 * // steps.length === 2
 */
export function splitTranscriptIntoCookingSteps(transcriptText: string): string[] {
  const trimmed = transcriptText.trim();
  if (!trimmed) return [];
  const rawChunks = splitIntoNonEmptyLines(trimmed)
    .flatMap((line) => line.split(SPOKEN_TRANSITION_SPLIT_PATTERN))
    .map((chunk) => cleanSpokenChatterPrefix(chunk.trim()))
    .filter((chunk) => chunk.length > 12 && !SPOKEN_CHATTER_NOISE_PATTERN.test(chunk));
  return rawChunks.map((chunk) => capitalizeStepSentence(chunk));
}

function cleanSpokenChatterPrefix(chunk: string): string {
  return chunk
    .replace(/^(?:oi\s+gente[,!\s]*|ol[aá]\s+pessoal[,!\s]*|ent[aã]o\s+pessoal[,!\s]*)/i, '')
    .trim();
}

function capitalizeStepSentence(text: string): string {
  const cleaned = text.replace(/\s+/g, ' ').trim();
  if (!cleaned) return '';
  const first = cleaned.charAt(0).toUpperCase() + cleaned.slice(1);
  return /[.!?]$/.test(first) ? first : `${first}.`;
}

/**
 * Extrai menções de ingredientes com medidas a partir da fala transcrita de um vídeo
 * quando a legenda/descrição não listou os ingredientes.
 *
 * @example
 * extractSpokenIngredientsFromTranscript('coloque 1 ovo e 2 colheres de chocolate em pó na caneca');
 * // => ['1 ovo', '2 colheres de chocolate em pó']
 */
export function extractSpokenIngredientsFromTranscript(transcriptText: string): string[] {
  const trimmed = transcriptText.trim();
  if (!trimmed) return [];
  const structured = tryExtractMultilineTranscriptIngredients(trimmed);
  if (structured.length > 0) return structured;
  const matches = collectSpokenIngredientMatches(trimmed);
  return deduplicateNormalizedIngredients(matches);
}

function tryExtractMultilineTranscriptIngredients(transcriptText: string): string[] {
  if (!transcriptText.includes('\n')) return [];
  try {
    const parsed = parseFreeformRecipeText(transcriptText);
    return [...parsed.extractedIngredients];
  } catch {
    return [];
  }
}

function collectSpokenIngredientMatches(transcriptText: string): string[] {
  const found: Array<{ index: number; text: string }> = [];
  const patterns = [
    SPOKEN_MEASURED_INGREDIENT_PATTERN,
    SPOKEN_COUNTED_INGREDIENT_PATTERN,
    SPOKEN_UNMEASURED_STAPLE_PATTERN,
  ];
  for (const pattern of patterns) {
    for (const match of transcriptText.matchAll(pattern)) {
      const cleaned = match[1].replace(/\s+/g, ' ').trim();
      if (cleaned) found.push({ index: match.index ?? 0, text: cleaned });
    }
  }
  return found.sort((a, b) => a.index - b.index).map((item) => item.text);
}

function deduplicateNormalizedIngredients(items: readonly string[]): string[] {
  const seen = new Set<string>();
  const unique: string[] = [];
  for (const item of items) {
    const key = item.toLowerCase();
    if (!seen.has(key)) {
      seen.add(key);
      unique.push(item);
    }
  }
  return unique;
}

/**
 * Verifica se a lista de ingredientes ou passos contém apenas textos genéricos de placeholder
 * ("Confira as quantidades no vídeo", "Assista ao passo a passo...").
 *
 * @example
 * hasPlaceholderRecipeContent(['Confira as quantidades no vídeo'], ['Bata tudo']); // true
 */
export function hasPlaceholderRecipeContent(
  ingredients: readonly string[],
  steps: readonly string[],
): boolean {
  if (ingredients.length === 0 || steps.length === 0) {
    return true;
  }
  const hasPlaceholderIngredient =
    ingredients.length === 1 && PLACEHOLDER_PREFIX_PATTERN.test(ingredients[0].trim());
  const hasPlaceholderStep =
    steps.length === 1 && PLACEHOLDER_PREFIX_PATTERN.test(steps[0].trim());
  return hasPlaceholderIngredient || hasPlaceholderStep;
}

/**
 * Recupera o texto de transcrição salvo no campo dedicado ou embutido no bloco de notas legadas.
 *
 * @example
 * const transcript = extractEmbeddedTranscriptFromNotes(recipe.unifiedChefNotesAndNutrition, recipe.videoTranscriptText);
 */
export function extractEmbeddedTranscriptFromNotes(
  unifiedNotes: string,
  dedicatedTranscript?: string,
): string {
  if (dedicatedTranscript && dedicatedTranscript.trim().length > 0) {
    return dedicatedTranscript.trim();
  }
  const match = unifiedNotes.match(TRANSCRIPT_MARKER_PATTERN);
  return match && match[1] ? match[1].trim() : '';
}

/**
 * Reconstrói ingredientes, passos estruturados, tempo e rendimento diretamente a partir da
 * transcrição falada do vídeo, permitindo seguir a receita mesmo sem assistir ao vídeo.
 *
 * @example
 * const rebuilt = reconstructRecipeFromTranscript('Coloque 2 ovos e 1 xícara de açúcar. Bata bem por 5 minutos.', 'Bolo');
 */
export function reconstructRecipeFromTranscript(
  transcriptText: string,
  fallbackTitle = 'Receita Transcrita',
): ParsedRecipeTextResult {
  const cleanedTranscript = transcriptText.trim();
  if (!cleanedTranscript) {
    throw new Error(
      `Transcrição vazia para reconstrução de receita: "${transcriptText}". Esperado: texto transcrito do vídeo.`,
    );
  }
  const structuredAttempt = tryParseStructuredTranscriptBlock(cleanedTranscript, fallbackTitle);
  if (structuredAttempt) {
    return structuredAttempt;
  }
  const spokenIngredients = extractSpokenIngredientsFromTranscript(cleanedTranscript);
  const spokenSteps = splitTranscriptIntoCookingSteps(cleanedTranscript);
  return {
    extractedTitle: fallbackTitle.trim() || 'Receita Transcrita',
    extractedIngredients:
      spokenIngredients.length > 0
        ? spokenIngredients
        : ['Ingredientes mencionados ao longo dos passos abaixo'],
    extractedSteps:
      spokenSteps.length > 0 ? spokenSteps : [capitalizeStepSentence(cleanedTranscript)],
    extractedMinutes: extractPreparationMinutesFromText(cleanedTranscript),
    extractedServings: extractServingsFromText(cleanedTranscript),
    extractedNotesAndNutrition: `🎙️ Transcrição Completa do Vídeo:\n${cleanedTranscript}`,
  };
}

function tryParseStructuredTranscriptBlock(
  transcriptText: string,
  fallbackTitle: string,
): ParsedRecipeTextResult | null {
  if (!transcriptText.includes('\n')) return null;
  try {
    const parsed = parseFreeformRecipeText(`${fallbackTitle}\n${transcriptText}`);
    if (parsed.extractedIngredients.length > 0 && parsed.extractedSteps.length > 0) {
      return parsed;
    }
    return null;
  } catch {
    return null;
  }
}