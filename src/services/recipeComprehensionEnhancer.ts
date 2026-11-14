import { isRecipeGroupHeading } from './recipeGroupHeadings';

/**
 * Representação decomposta de uma linha de ingrediente para facilitar a leitura rápida na bancada (Mise en Place).
 */
export interface StructuredIngredientView {
  readonly rawLine: string;
  readonly quantityAndUnit: string | null;
  readonly ingredientName: string;
  readonly preparationHint: string | null;
}

/**
 * Pistas visuais e ingredientes vinculados a um passo específico do Modo de Preparo,
 * permitindo executar a etapa sem precisar assistir ao vídeo.
 */
export interface StepExecutionCues {
  readonly matchedIngredients: readonly string[];
  readonly heatOrTemperatureCue: string | null;
  readonly visualDonenessCue: string | null;
  readonly actionVerbBadge: string | null;
}

const LEADING_QUANTITY_UNIT_PATTERN =
  /^((?:\d+(?:\s+\d+\/\d+|[.,/]\d+)?|meia|meio|uma|um|duas|dois|tr[eê]s|quatro)\s*(?:g|gr|gramas?|kg|quilos?|ml|litros?|l|x[ií]caras?(?:\s+de\s+(?:ch[aá]|caf[eé]))?|colher(?:es)?(?:\s+de\s+(?:sopa|ch[aá]|sobremesa|caf[eé]))?|pitadas?|dentes?|latas?|caixinhas?|pacotes?|sach[eê]s?|tabletes?|folhas?|ramos?|fatias?|rodelas?|unidades?)?)\s+(?:de\s+)?(.+)$/i;

const TRAILING_A_GOSTO_PATTERN = /^(.+?)\s+(a\s+gosto)$/i;

const PREPARATION_HINT_PATTERN =
  /\b((?:bem\s+)?(?:picad[ao]s?(?:\s+em\s+[a-zà-ÿ]+)?|ralad[ao]s?(?:\s+no\s+ralo\s+[a-zà-ÿ]+)?|peneirad[ao]s?|derretid[ao]s?|amassad[ao]s?|fatiad[ao]s?|cortad[ao]s?(?:\s+em\s+[a-zà-ÿ]+(?:\s+[a-zà-ÿ]+)?)?|em\s+cubos?(?:\s+pequenos|\s+m[eé]dios|\s+grandes)?|em\s+tiras?|em\s+rodelas?|em\s+temperatura\s+ambiente|gelad[ao]s?|morn[ao]s?|fervente|cozid[ao]s?\s+e\s+desfiad[ao]s?|desfiad[ao]s?|escorrid[ao]s?|sem\s+pele|sem\s+sementes?))$/i;

const TEMPERATURE_OR_HEAT_PATTERN =
  /\b((?:forno\s+(?:pr[eé]-aquecido\s+)?a\s*)?\d{2,3}\s*°?\s*(?:c|graus)|fogo\s+(?:bem\s+)?(?:baixo|m[eé]dio|alto|brando)|banho-maria|air\s*fryer)\b/i;

const VISUAL_DONENESS_PATTERN =
  /\b(at[eé]\s+(?:dourar(?:\s+levemente)?|desgrudar(?:\s+do\s+fundo(?:\s+da\s+panela)?)?|dobrar\s+de\s+(?:volume|tamanho)|ficar\s+(?:homog[eê]neo|cremoso|firme|macio|transparente|al\s+dente|bem\s+incorporado)|engrossar|ferver|secar|reduzir|murchar|derreter|formar\s+uma\s+crosta)|ponto\s+de\s+(?:brigadeiro|fita|bala|neve|pomada))\b/i;

const ACTION_VERB_MAP: ReadonlyArray<{ readonly pattern: RegExp; readonly label: string }> = [
  { pattern: /\b(bata|bater|liquidificador|batedeira)\b/i, label: '🔄 Bater / Liquidificar' },
  { pattern: /\b(refogue|refogar|doure|dourar|sele|selar|frite|fritar)\b/i, label: '🍳 Refogar / Dourar' },
  { pattern: /\b(asse|assar|forno|gratinar|gratine)\b/i, label: '🔥 Assar / Forno' },
  { pattern: /\b(cozinhe|cozinhar|ferva|ferver)\b/i, label: '🍲 Cozinhar / Ferver' },
  { pattern: /\b(misture|misturar|incorpore|incorporar|mexa|mexer|envolva)\b/i, label: '🥣 Misturar / Incorporar' },
  { pattern: /\b( sove|sovar|abra\s+a\s+massa|modele|modelar)\b/i, label: '👐 Modelar / Massa' },
  { pattern: /\b(gele|gelar|geladeira|freezer|esfrie|esfriar|descanse|descansar|reserve)\b/i, label: '❄️ Descansar / Gelar' },
];

const IGNORED_INGREDIENT_STOPWORDS = new Set([
  'de',
  'do',
  'da',
  'dos',
  'das',
  'com',
  'sem',
  'para',
  'em',
  'ou',
  'a',
  'o',
  'e',
  'gosto',
  'chá',
  'cha',
  'sopa',
  'café',
  'cafe',
  'sobremesa',
  'xícara',
  'xicara',
  'xícaras',
  'xicaras',
  'colher',
  'colheres',
  'gramas',
  'quilos',
  'litros',
  'lata',
  'caixinha',
  'pacote',
  'dente',
  'dentes',
  'pitada',
  'unidade',
  'unidades',
  'fresco',
  'fresca',
  'picado',
  'picada',
  'ralado',
  'ralada',
  'peneirado',
  'peneirada',
]);

/**
 * Decompõe uma linha de ingrediente em Quantidade/Unidade, Nome Principal e Dica de Preparo Prévio (Mise en Place).
 *
 * @example
 * const parsed = parseStructuredIngredientLine('2 xícaras de farinha de trigo peneirada');
 * // parsed.quantityAndUnit === '2 xícaras'
 * // parsed.ingredientName === 'farinha de trigo'
 * // parsed.preparationHint === 'peneirada'
 */
export function parseStructuredIngredientLine(ingredientLine: string): StructuredIngredientView {
  const cleaned = ingredientLine.trim();
  if (!cleaned) {
    return { rawLine: '', quantityAndUnit: null, ingredientName: '', preparationHint: null };
  }
  const { quantityAndUnit, remainder } = splitLeadingQuantityOrTrailingGosto(cleaned);
  const { coreName, preparationHint } = splitPreparationHintFromName(remainder);
  return {
    rawLine: cleaned,
    quantityAndUnit,
    ingredientName: coreName,
    preparationHint,
  };
}

function splitLeadingQuantityOrTrailingGosto(line: string): {
  quantityAndUnit: string | null;
  remainder: string;
} {
  const leadingMatch = line.match(LEADING_QUANTITY_UNIT_PATTERN);
  if (leadingMatch && leadingMatch[1] && leadingMatch[2]) {
    return {
      quantityAndUnit: leadingMatch[1].trim(),
      remainder: leadingMatch[2].trim(),
    };
  }
  const trailingMatch = line.match(TRAILING_A_GOSTO_PATTERN);
  if (trailingMatch && trailingMatch[1] && trailingMatch[2]) {
    return {
      quantityAndUnit: trailingMatch[2].trim(),
      remainder: trailingMatch[1].trim(),
    };
  }
  return { quantityAndUnit: null, remainder: line };
}

function splitPreparationHintFromName(nameCandidate: string): {
  coreName: string;
  preparationHint: string | null;
} {
  const commaParts = nameCandidate.split(/,\s+/);
  if (commaParts.length === 2 && commaParts[1].trim().length > 2) {
    return { coreName: commaParts[0].trim(), preparationHint: commaParts[1].trim() };
  }
  const hintMatch = nameCandidate.match(PREPARATION_HINT_PATTERN);
  if (hintMatch && hintMatch[1]) {
    const core = nameCandidate.slice(0, hintMatch.index).replace(/[,()\s]+$/, '').trim();
    if (core.length >= 2) {
      return { coreName: core, preparationHint: hintMatch[1].trim() };
    }
  }
  return { coreName: nameCandidate, preparationHint: null };
}

/**
 * Analisa um passo do Modo de Preparo e cruza com os ingredientes escalonados da receita,
 * retornando os ingredientes exatos daquela etapa, temperatura, verbo de ação e ponto esperado.
 *
 * @example
 * const cues = analyzeCookingStepComprehension('Bata os ovos com o açúcar até dobrar de volume em forno a 180°C', ['3 ovos', '1 xícara de açúcar']);
 * // cues.matchedIngredients => ['3 ovos', '1 xícara de açúcar']
 */
export function analyzeCookingStepComprehension(
  stepText: string,
  scaledIngredients: readonly string[],
): StepExecutionCues {
  return {
    matchedIngredients: matchStepIngredients(stepText, scaledIngredients),
    heatOrTemperatureCue: extractRegexCue(stepText, TEMPERATURE_OR_HEAT_PATTERN),
    visualDonenessCue: extractRegexCue(stepText, VISUAL_DONENESS_PATTERN),
    actionVerbBadge: detectActionVerbBadge(stepText),
  };
}

/**
 * Identifica quais ingredientes escalonados da receita são utilizados em um determinado passo.
 *
 * @example
 * matchStepIngredients('Misture a farinha e o leite morno', ['2 xícaras de farinha de trigo', '1 xícara de leite', '1 colher de fermento']);
 * // => ['2 xícaras de farinha de trigo', '1 xícara de leite']
 */
export function matchStepIngredients(
  stepText: string,
  scaledIngredients: readonly string[],
): string[] {
  const normalizedStep = normalizeDiacritics(stepText);
  if (!normalizedStep) return [];
  const matched: string[] = [];
  for (const rawIng of scaledIngredients) {
    if (isRecipeGroupHeading(rawIng)) continue;
    const tokens = extractCoreIngredientTokens(rawIng);
    if (tokens.some((token) => containsWholeStemInStep(normalizedStep, token))) {
      matched.push(rawIng);
    }
  }
  return matched;
}

function extractCoreIngredientTokens(ingredientLine: string): string[] {
  const structured = parseStructuredIngredientLine(ingredientLine);
  const words = normalizeDiacritics(structured.ingredientName)
    .replace(/[^a-z0-9\s-]/g, ' ')
    .split(/\s+/)
    .filter((word) => word.length >= 3 && !IGNORED_INGREDIENT_STOPWORDS.has(word));
  return words;
}

function containsWholeStemInStep(normalizedStep: string, ingredientWord: string): boolean {
  const singularStem = ingredientWord.replace(/(?:oes|aes|is|ns|s)$/, '');
  const root = singularStem.length >= 3 ? singularStem : ingredientWord;
  const regex = new RegExp(`\\b${escapeRegExp(root)}[a-z]*\\b`, 'i');
  return regex.test(normalizedStep);
}

function escapeRegExp(text: string): string {
  return text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&');
}

function normalizeDiacritics(input: string): string {
  return input
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function extractRegexCue(stepText: string, pattern: RegExp): string | null {
  const match = stepText.match(pattern);
  return match && match[1] ? match[1].trim() : null;
}

function detectActionVerbBadge(stepText: string): string | null {
  for (const entry of ACTION_VERB_MAP) {
    if (entry.pattern.test(stepText)) {
      return entry.label;
    }
  }
  return null;
}

/**
 * Formata apenas os ingredientes ainda não marcados no checklist em uma Lista de Compras pronta para copiar.
 *
 * @example
 * const text = formatMissingIngredientsShoppingList('Bolo de Cenoura', ['3 cenouras', '4 ovos'], new Set([0]));
 * // text.includes('4 ovos') === true && text.includes('3 cenouras') === false
 */
export function formatMissingIngredientsShoppingList(
  recipeTitle: string,
  scaledIngredients: readonly string[],
  checkedIndices: ReadonlySet<number>,
): string {
  const missingItems = scaledIngredients.filter(
    (line, idx) => !isRecipeGroupHeading(line) && !checkedIndices.has(idx),
  );
  if (missingItems.length === 0) {
    return `✅ Todos os ingredientes para "${recipeTitle}" já estão separados na bancada!`;
  }
  const bulletLines = missingItems.map((item) => `• ${item}`).join('\n');
  return `🛒 Lista de Ingredientes (${recipeTitle}):\n${bulletLines}`;
}