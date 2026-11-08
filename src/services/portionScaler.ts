const LEADING_QUANTITY_PATTERN = /^(\s*)(\d+\/\d+|\d+(?:[.,]\d+)?)(\b|\s*)(.*)$/;

/**
 * Escalona proporcionalmente a quantidade numérica inicial de uma linha de ingrediente.
 *
 * @example
 * const scaled = scaleIngredientLineQuantity('500g de Polvilho azedo', 4, 8);
 * // scaled === '1000g de Polvilho azedo'
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
  if (baseServings === targetServings) {
    return ingredientLine;
  }
  const match = ingredientLine.match(LEADING_QUANTITY_PATTERN);
  if (!match) {
    return ingredientLine;
  }
  const numericValue = parseQuantityToken(match[2]);
  if (numericValue === null) {
    return ingredientLine;
  }
  const ratio = targetServings / baseServings;
  const formatted = formatScaledNumber(numericValue * ratio);
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
 * Converte uma string numérica ou fração simples ("1/2", "2,5", "300") em número decimal.
 *
 * @example
 * const val = parseQuantityToken('1/2');
 * // val === 0.5
 */
export function parseQuantityToken(rawToken: string): number | null {
  if (rawToken.includes('/')) {
    const [numStr, denStr] = rawToken.split('/');
    const numerator = Number(numStr);
    const denominator = Number(denStr);
    if (!denominator || Number.isNaN(numerator)) return null;
    return numerator / denominator;
  }
  const parsed = Number(rawToken.replace(',', '.'));
  return Number.isNaN(parsed) ? null : parsed;
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
