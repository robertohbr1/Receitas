import { ParsedRecipeTextResult } from '../types/recipeTypes';

type ParserSectionMode = 'header' | 'ingredients' | 'steps' | 'notes';

/**
 * Analisa um texto colado de redes sociais, YouTube ou sites e separa automaticamente
 * título, ingredientes, modo de preparo, tempo, rendimento e notas/calorias.
 *
 * @example
 * const parsed = parseFreeformRecipeText('Bolo de Milho\nIngredientes:\n- 3 ovos\nModo de preparo:\n1. Bata tudo');
 * // parsed.extractedTitle === 'Bolo de Milho'
 */
export function parseFreeformRecipeText(rawText: string): ParsedRecipeTextResult {
  const cleanLines = splitIntoNonEmptyLines(rawText);
  if (cleanLines.length === 0) {
    throw new Error(
      `Texto para importação está vazio. Recebido: "${rawText}". Esperado: texto contendo título, ingredientes ou passos.`,
    );
  }
  return buildParsedRecipeFromLines(cleanLines, rawText);
}

/**
 * Divide um bloco de texto em linhas limpas, descartando linhas em branco.
 *
 * @example
 * const lines = splitIntoNonEmptyLines(' Linha 1 \n\n Linha 2 ');
 * // lines.length === 2
 */
export function splitIntoNonEmptyLines(rawText: string): string[] {
  return rawText
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.length > 0);
}

function buildParsedRecipeFromLines(
  lines: readonly string[],
  fullText: string,
): ParsedRecipeTextResult {
  const extractedTitle = stripLeadingBulletOrNumber(lines[0]);
  const buckets = categorizeRecipeLines(lines.slice(1));
  return {
    extractedTitle,
    extractedIngredients: buckets.ingredients,
    extractedSteps: buckets.steps,
    extractedMinutes: extractPreparationMinutesFromText(fullText),
    extractedServings: extractServingsFromText(fullText),
    extractedNotesAndNutrition: buckets.notes.join('\n'),
  };
}

function categorizeRecipeLines(lines: readonly string[]): {
  ingredients: string[];
  steps: string[];
  notes: string[];
} {
  let currentSection: ParserSectionMode = 'header';
  const buckets = { ingredients: [] as string[], steps: [] as string[], notes: [] as string[] };
  for (const line of lines) {
    const detectedHeader = detectSectionHeader(line);
    if (detectedHeader !== null) {
      currentSection = detectedHeader;
      continue;
    }
    if (currentSection === 'ingredients' && looksLikeCookingInstructionSentence(line)) {
      currentSection = 'steps';
    }
    appendLineToBucket(line, currentSection, buckets);
  }
  return {
    ingredients: buckets.ingredients,
    steps: mergeWrappedContinuationLines(buckets.steps),
    notes: buckets.notes,
  };
}

function mergeWrappedContinuationLines(lines: readonly string[]): string[] {
  const merged: string[] = [];
  for (const line of lines) {
    const startsLowercase = /^[a-zà-ÿ]/.test(line);
    if (startsLowercase && merged.length > 0) {
      merged[merged.length - 1] = `${merged[merged.length - 1]} ${line}`;
      continue;
    }
    merged.push(line);
  }
  return merged;
}

function appendLineToBucket(
  line: string,
  section: ParserSectionMode,
  buckets: { ingredients: string[]; steps: string[]; notes: string[] },
): void {
  const cleanedLine = stripLeadingBulletOrNumber(line);
  if (!cleanedLine) return;
  if (section === 'ingredients' && !looksLikeCookingInstructionSentence(cleanedLine)) {
    buckets.ingredients.push(cleanedLine);
    return;
  }
  if (section === 'header' && looksLikeIngredientLine(line)) {
    buckets.ingredients.push(cleanedLine);
    return;
  }
  if (section === 'notes' || looksLikeNutritionOrNoteLine(line)) {
    buckets.notes.push(cleanedLine);
    return;
  }
  buckets.steps.push(cleanedLine);
}

/**
 * Identifica se uma linha começa com verbo de instrução culinária (preparo) ou é longa demais para ser apenas um ingrediente.
 *
 * @example
 * const isStep = looksLikeCookingInstructionSentence('Derrete 250g de chocolate no microondas');
 * // isStep === true
 */
export function looksLikeCookingInstructionSentence(cleanedLine: string): boolean {
  const normalized = cleanedLine.toLowerCase().trim();
  return /^(derret[ae]|mistur[ae]|bat[ae]|ass[ae]|lev[ae]|adicione|acrescente|coloque|despeje|refogue|cozinhe|frite|mexa|reserve|sirva|deixe|modele|unte)\b/.test(
    normalized,
  );
}

/**
 * Detecta se uma linha é um cabeçalho de seção (ingredientes, preparo ou notas/nutrição).
 *
 * @example
 * const section = detectSectionHeader('Modo de Preparo:');
 * // section === 'steps'
 */
export function detectSectionHeader(line: string): ParserSectionMode | null {
  const normalized = line.toLowerCase().replace(/[:\-*#🎬📝🛒👩‍🍳]/g, '').trim();
  if (normalized.length > 42) return null;
  if (/^(ingredientes?(\s+d[aeo]s?\s+\w+)?|o que voc[eê] vai precisar|massa|calda|recheio|cobertura)$/.test(normalized)) {
    return 'ingredients';
  }
  if (/^(modo de preparo|modo de fazer|como fazer|preparo|passo a passo|instru[cç][oõ]es)$/.test(normalized)) {
    return 'steps';
  }
  if (/^(dicas?|notas?|observa[cç][oõ]es|informa[cç][aã]o nutricional|calorias|nutri[cç][aã]o)$/.test(normalized)) {
    return 'notes';
  }
  return null;
}

/**
 * Estima se uma linha avulsa possui formato típico de ingrediente culinário.
 *
 * @example
 * const isIng = looksLikeIngredientLine('2 colheres de sopa de manteiga');
 * // isIng === true
 */
export function looksLikeIngredientLine(line: string): boolean {
  const startsWithBullet = /^[-•*]\s+/.test(line);
  const hasMeasurementUnit =
    /\b(\d+\s*(g|kg|ml|l|litros?|x[ií]caras?|colher(?:es)?|pitadas?|dentes?|unidades?|pacotes?|latas?|caixinhas?|ovos?|cebolas?|cenouras?)|a gosto|meia x[ií]cara)\b/i.test(
      line,
    );
  return startsWithBullet || (hasMeasurementUnit && line.length < 95);
}

function looksLikeNutritionOrNoteLine(line: string): boolean {
  return /\b(kcal|calorias|prote[ií]nas?|carboidratos?|dica\s*:|obs\s*:|nota\s*:)/i.test(line);
}

/**
 * Remove marcadores de lista ou numeração inicial de uma linha de texto.
 *
 * @example
 * const clean = stripLeadingBulletOrNumber('1. Misture bem os ovos');
 * // clean === 'Misture bem os ovos'
 */
export function stripLeadingBulletOrNumber(line: string): string {
  return line.replace(/^([-•*]|\d+[.)])\s*/, '').trim();
}

/**
 * Extrai o tempo de preparo em minutos a partir de menções textuais (ex: "40 min").
 *
 * @example
 * const mins = extractPreparationMinutesFromText('Tempo de forno: 45 minutos');
 * // mins === 45
 */
export function extractPreparationMinutesFromText(text: string): number {
  const match = text.match(/(\d{1,3})\s*(?:min(?:uto)?s?)\b/i);
  if (match && match[1]) {
    return Math.max(1, parseInt(match[1], 10));
  }
  return 30;
}

/**
 * Extrai a quantidade de porções a partir de menções textuais (ex: "Rende 6 porções").
 *
 * @example
 * const servings = extractServingsFromText('Rendimento: 8 porções');
 * // servings === 8
 */
export function extractServingsFromText(text: string): number {
  const match = text.match(/(\d{1,2})\s*(?:por[cç][oõ]es|pessoas|fatias|unidades)\b/i);
  if (match && match[1]) {
    return Math.max(1, parseInt(match[1], 10));
  }
  return 4;
}
