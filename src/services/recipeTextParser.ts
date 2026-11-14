import { ParsedRecipeTextResult } from '../types/recipeTypes';
import { sanitizeRecipeGroupHeadings } from './recipeGroupHeadings';
import {
  analyzeSectionHeaderLine,
  hasLeadingListMarker,
  looksLikeCookingInstructionSentence,
  looksLikeIngredientLine,
  looksLikeNutritionOrNoteLine,
  looksLikeShortIngredientName,
  looksLikeYieldOrTimeMetadataLine,
  RecipeSectionHeaderMatch,
  RecipeSectionKind,
  stripLeadingBulletOrNumber,
} from './recipeLineClassifier';
import {
  mergeWrappedIngredientLines,
  mergeWrappedStepLines,
  RecipeBucketEntry,
  splitLongStepParagraphs,
} from './recipeLineMerging';
import {
  extractPreparationMinutesFromText,
  extractServingsFromText,
} from './recipeYieldAndTimeExtractor';

// Reexportações mantêm o contrato público histórico deste módulo.
export {
  detectSectionHeader,
  looksLikeCookingInstructionSentence,
  looksLikeIngredientLine,
  stripLeadingBulletOrNumber,
} from './recipeLineClassifier';
export {
  extractPreparationMinutesFromText,
  extractServingsFromText,
} from './recipeYieldAndTimeExtractor';

type ParserSectionMode = 'header' | RecipeSectionKind;

interface RecipeLineBuckets {
  readonly ingredients: RecipeBucketEntry[];
  readonly steps: RecipeBucketEntry[];
  readonly notes: string[];
}

interface RecipeParserState {
  section: ParserSectionMode;
  lastFilledBucket: RecipeSectionKind | null;
  hasSeenExplicitStepsHeader: boolean;
  pendingIngredientsGroup: string | null;
  pendingStepsGroup: string | null;
  readonly buckets: RecipeLineBuckets;
}

/**
 * Lista final separada em ingredientes, passos e notas (subtítulos de grupo terminam com ":").
 */
export interface SeparatedRecipeSections {
  readonly ingredients: string[];
  readonly steps: string[];
  readonly notes: string[];
}

const FALLBACK_IMPORTED_TITLE = 'Receita Importada';

/**
 * Analisa um texto colado de redes sociais, YouTube ou sites e separa automaticamente
 * título, ingredientes (com subgrupos), modo de preparo, tempo, rendimento e notas/calorias.
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
  const { title, bodyLines } = resolveTitleAndBodyLines(cleanLines);
  const sections = separateRecipeSections(bodyLines);
  return {
    extractedTitle: title,
    extractedIngredients: sections.ingredients,
    extractedSteps: sections.steps,
    extractedMinutes: extractPreparationMinutesFromText(rawText),
    extractedServings: extractServingsFromText(rawText),
    extractedNotesAndNutrition: sections.notes.join('\n'),
  };
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

function resolveTitleAndBodyLines(lines: readonly string[]): {
  title: string;
  bodyLines: readonly string[];
} {
  const firstLineIsHeader = analyzeSectionHeaderLine(lines[0])?.section != null;
  const candidateTitle = stripLeadingBulletOrNumber(lines[0]);
  if (firstLineIsHeader || !candidateTitle) {
    return { title: FALLBACK_IMPORTED_TITLE, bodyLines: lines };
  }
  return { title: candidateTitle, bodyLines: lines.slice(1) };
}

/**
 * Classifica linhas (sem o título) em ingredientes, passos e notas usando cabeçalhos,
 * subtítulos de grupo e heurísticas de verbo/quantidade.
 *
 * @example
 * const sections = separateRecipeSections(['Massa:', '2 ovos', 'Cobertura:', '1 lata de leite condensado']);
 * // sections.ingredients => ['Massa:', '2 ovos', 'Cobertura:', '1 lata de leite condensado']
 */
export function separateRecipeSections(lines: readonly string[]): SeparatedRecipeSections {
  const state: RecipeParserState = {
    section: 'header',
    lastFilledBucket: null,
    hasSeenExplicitStepsHeader: false,
    pendingIngredientsGroup: null,
    pendingStepsGroup: null,
    buckets: { ingredients: [], steps: [], notes: [] },
  };
  for (const line of expandInlineBulletLines(lines)) {
    consumeRecipeLine(line, state);
  }
  return finalizeRecipeBuckets(state.buckets);
}

function expandInlineBulletLines(lines: readonly string[]): string[] {
  return lines.flatMap((line) => {
    if (!/^\s*[•▪◦]\s+\S/.test(line) || !/\s+[•▪◦]\s+\S/.test(line)) {
      return [line];
    }
    return line
      .split(/\s*(?=[•▪◦]\s+\S)/)
      .map((part) => part.trim())
      .filter((part) => part.length > 0);
  });
}

function consumeRecipeLine(line: string, state: RecipeParserState): void {
  const header = analyzeSectionHeaderLine(line);
  if (header) {
    applySectionHeader(header, line, state);
    return;
  }
  if (looksLikeYieldOrTimeMetadataLine(line) || looksLikeNutritionOrNoteLine(line)) {
    pushNote(stripLeadingBulletOrNumber(line), state);
    return;
  }
  routeContentLine(line, state);
}

function applySectionHeader(
  header: RecipeSectionHeaderMatch,
  line: string,
  state: RecipeParserState,
): void {
  if (header.section === 'notes') {
    state.section = 'notes';
    pushNote(stripLeadingBulletOrNumber(line), state);
    return;
  }
  if (header.section === 'steps') state.hasSeenExplicitStepsHeader = true;
  // Em receitas escritas por componente (Massa -> Recheio) sem "Modo de Preparo",
  // um novo subtítulo de grupo reabre a coleta de ingredientes daquele componente.
  const keepStepsMode = header.section === 'steps' || state.hasSeenExplicitStepsHeader;
  state.section = header.section ?? (keepStepsMode ? 'steps' : 'ingredients');
  updatePendingGroups(header, state);
  if (header.inlineContent) consumeInlineSectionContent(header.inlineContent, state);
}

function updatePendingGroups(header: RecipeSectionHeaderMatch, state: RecipeParserState): void {
  if (header.section === 'ingredients') {
    state.pendingIngredientsGroup = header.groupTitle;
    return;
  }
  if (header.section === 'steps') {
    state.pendingStepsGroup = header.groupTitle;
    return;
  }
  state.pendingIngredientsGroup = header.groupTitle;
  state.pendingStepsGroup = header.groupTitle;
}

function consumeInlineSectionContent(inlineContent: string, state: RecipeParserState): void {
  const isInstruction =
    state.section === 'steps' || looksLikeCookingInstructionSentence(inlineContent);
  const pieces = isInstruction
    ? [inlineContent]
    : inlineContent.split(/\s*;\s*|,\s+(?=\d)|\s+e\s+(?=\d)/);
  for (const piece of pieces) {
    if (piece.trim()) routeContentLine(piece.trim(), state);
  }
}

function routeContentLine(line: string, state: RecipeParserState): void {
  const entry: RecipeBucketEntry = {
    text: stripLeadingBulletOrNumber(line),
    hasListMarker: hasLeadingListMarker(line),
  };
  if (!entry.text) return;
  if (state.section === 'header') {
    routeUnsectionedLine(line, entry, state);
    return;
  }
  if (state.section === 'ingredients') {
    routeIngredientSectionLine(entry, state);
    return;
  }
  if (state.section === 'notes') {
    pushNote(entry.text, state);
    return;
  }
  pushEntry('steps', entry, state);
}

function routeIngredientSectionLine(entry: RecipeBucketEntry, state: RecipeParserState): void {
  if (!looksLikeCookingInstructionSentence(entry.text)) {
    pushEntry('ingredients', entry, state);
    return;
  }
  state.section = 'steps';
  pushEntry('steps', entry, state);
}

function routeUnsectionedLine(
  rawLine: string,
  entry: RecipeBucketEntry,
  state: RecipeParserState,
): void {
  const { buckets } = state;
  const isStepContinuation =
    state.lastFilledBucket === 'steps' && !entry.hasListMarker && /^[a-zà-ÿ]/.test(entry.text);
  const isPromoExclamation = /!$/.test(entry.text) && buckets.steps.length === 0;
  if (isStepContinuation || (!isPromoExclamation && looksLikeCookingInstructionSentence(entry.text))) {
    pushEntry('steps', entry, state);
    return;
  }
  const continuesIngredients =
    buckets.ingredients.length > 0 && buckets.steps.length === 0 && looksLikeShortIngredientName(entry.text);
  if (looksLikeIngredientLine(rawLine) || continuesIngredients) {
    pushEntry('ingredients', entry, state);
    return;
  }
  if (entry.hasListMarker && /^\s*\d/.test(rawLine)) pushEntry('steps', entry, state);
  else pushNote(entry.text, state);
}

function pushEntry(
  target: 'ingredients' | 'steps',
  entry: RecipeBucketEntry,
  state: RecipeParserState,
): void {
  const pending =
    target === 'ingredients' ? state.pendingIngredientsGroup : state.pendingStepsGroup;
  if (pending) {
    state.buckets[target].push({ text: pending, hasListMarker: true });
    if (target === 'ingredients') state.pendingIngredientsGroup = null;
    else state.pendingStepsGroup = null;
  }
  state.buckets[target].push(entry);
  state.lastFilledBucket = target;
}

function pushNote(noteText: string, state: RecipeParserState): void {
  if (!noteText) return;
  state.buckets.notes.push(noteText);
  state.lastFilledBucket = 'notes';
}

function finalizeRecipeBuckets(buckets: RecipeLineBuckets): SeparatedRecipeSections {
  const ingredients = mergeWrappedIngredientLines(buckets.ingredients).map((e) => e.text);
  const steps = splitLongStepParagraphs(mergeWrappedStepLines(buckets.steps)).map((e) => e.text);
  return {
    ingredients: sanitizeRecipeGroupHeadings(ingredients),
    steps: sanitizeRecipeGroupHeadings(steps),
    notes: buckets.notes,
  };
}