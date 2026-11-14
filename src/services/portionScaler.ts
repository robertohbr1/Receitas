import { isRecipeGroupHeading } from './recipeGroupHeadings';

const UNICODE_FRACTION_VALUES: Readonly<Record<string, number>> = {
  '½': 0.5,
  '⅓': 1 / 3,
  '⅔': 2 / 3,
  '¼': 0.25,
  '¾': 0.75,
  '⅛': 0.125,
};

const LEADING_QUANTITY_PATTERN =
  /^(\s*)(\d+\s+e\s+\d+\/\d+|\d+\s+e\s+[½⅓⅔¼¾⅛]|\d+\s+\d+\/\d+|\d+\/\d+|\d+(?:[.,]\d+)?|[½⅓⅔¼¾⅛]|meia|meio)(\b|\s*)(.*)$/i;

/**
 * Escalona proporcionalmente a quantidade numérica inicial de uma linha de ingrediente,
 * preservando subtítulos de grupo ("Massa:") e linhas sem quantidade ("sal a gosto").
 *
 * @example
 * const scaled = scaleIngredientLineQuantity('1 e 1/2 xícara de açúcar', 4, 8);
 * // scaled === '3 xícara de açúcar'
 */
export function scaleIngredientLineQuantity(
  ingredientLine: string,
  baseServings: number,
  targetServings: number,
): string {
  if (baseServings <= 0 || targetServings <= 0) {
    throw new Error(
      `Porções inválidas para escalonamento: base=${baseServings}, alvo=${targetServings}. Esperado: inteiros > 0.`,
    );
  }
  if (baseServings === targetServings || isRecipeGroupHeading(ingredientLine)) {
    return ingredientLine;
  }
  const match = ingredientLine.match(LEADING_QUANTITY_PATTERN);
  const numericValue = match ? parseQuantityToken(match[2]) : null;
  if (!match || numericValue === null) {
    return ingredientLine;
  }
  const formatted = formatScaledNumber(numericValue * (targetServings / baseServings));
  return `${match[1]}${formatted}${match[3]}${match[4]}`;
}

/**
 * Escalona toda a lista de ingredientes de uma receita para o novo número de porções desejado.
 *
 * @example
 * const list = scaleIngredientsList(['2 ovos', '100ml leite'], 2, 4);
 * // list === ['4 ovos', '200ml leite']
 */
export function scaleIngredientsList(
  ingredients: readonly string[],
  baseServings: number,
  targetServings: number,
): string[] {
  return ingredients.map((line) =>
    scaleIngredientLineQuantity(line, baseServings, targetServings),
  );
}

/**
 * Converte uma string numérica, fração simples ("1/2"), fração mista ("1 e 1/2"),
 * fração Unicode ("½") ou palavra ("meia") em número decimal.
 *
 * @example
 * parseQuantityToken('1 e 1/2'); // 1.5
 */
export function parseQuantityToken(rawToken: string): number | null {
  const trimmed = rawToken.trim();
  if (/^mei[ao]$/i.test(trimmed)) return 0.5;
  if (trimmed in UNICODE_FRACTION_VALUES) return UNICODE_FRACTION_VALUES[trimmed];
  const mixedMatch = trimmed.match(/^(\d+)\s+(?:e\s+)?(.+)$/i);
  if (mixedMatch) {
    const whole = Number(mixedMatch[1]);
    const fraction = parseQuantityToken(mixedMatch[2]);
    return fraction !== null && !Number.isNaN(whole) ? whole + fraction : null;
  }
  if (trimmed.includes('/')) return parseSimpleSlashFraction(trimmed);
  const parsed = Number(trimmed.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
}

function parseSimpleSlashFraction(slashToken: string): number | null {
  const [numStr, denStr] = slashToken.split('/');
  const numerator = Number(numStr);
  const denominator = Number(denStr);
  if (!denominator || Number.isNaN(numerator)) {
    return null;
  }
  return numerator / denominator;
}

/**
 * Formata um valor numérico escalonado evitando casas decimais desnecessárias.
 *
 * @example
 * const text = formatScaledNumber(1.5);
 * // text === '1,5'
 */
export function formatScaledNumber(value: number): string {
  const rounded = Math.round(value * 100) / 100;
  if (Number.isInteger(rounded)) {
    return String(rounded);
  }
  const oneDecimal = Math.round(value * 10) / 10;
  return String(oneDecimal).replace('.', ',');
}