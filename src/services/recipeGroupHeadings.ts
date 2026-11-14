/**
 * Convenção de subgrupos dentro das listas de ingredientes e de preparo.
 *
 * Suporta três formatos sem alterar o contrato ` readonly string[]`:
 * 1. Linha de subtítulo terminada em ":" e sem números ("Massa:", "Para a calda:")
 * 2. Prefixo entre colchetes ("[Molho de queijo] Derreta a manteiga...")
 * 3. Sufixo entre parênteses repetido ("1 colher de manteiga (Molho de queijo)")
 */

const MAX_GROUP_HEADING_LENGTH = 45;
const BRACKET_PREFIX_PATTERN = /^\[([^\]]{2,40})\]\s*(.+)$/;
const PAREN_SUFFIX_PATTERN = /^(.+?)\s*\(([^()\d]{2,35})\)$/;

/**
 * Item numerável de uma lista de receita, com o índice original preservado para checklists.
 */
export interface RecipeListItemEntry {
  readonly text: string;
  readonly sourceIndex: number;
  readonly displayNumber: number;
}

/**
 * Bloco de itens agrupados sob um subtítulo opcional (null = itens sem subtítulo).
 */
export interface RecipeListBlock {
  readonly heading: string | null;
  readonly items: readonly RecipeListItemEntry[];
}

/**
 * Indica se a linha é um subtítulo de grupo ("Massa:", "Cobertura:") e não um item da lista.
 *
 * @example
 * isRecipeGroupHeading('Para o recheio:'); // true
 * isRecipeGroupHeading('2 xícaras de farinha:'); // false (contém quantidade)
 */
export function isRecipeGroupHeading(line: string): boolean {
  const trimmed = line.trim();
  if (!trimmed.endsWith(':') || trimmed.length > MAX_GROUP_HEADING_LENGTH) {
    return false;
  }
  const body = trimmed.slice(0, -1).trim();
  return body.length >= 2 && !/\d/.test(body) && body.split(/\s+/).length <= 6;
}

/**
 * Normaliza um título de grupo para o formato salvo nas listas ("Massa:").
 *
 * @example
 * formatRecipeGroupHeading('RECHEIO DE FRANGO'); // 'Recheio de frango:'
 */
export function formatRecipeGroupHeading(rawTitle: string): string {
  const cleaned = rawTitle.replace(/:+\s*$/, '').replace(/\s+/g, ' ').trim();
  if (!cleaned) {
    throw new Error(
      `Título de grupo vazio: "${rawTitle}". Esperado: texto como "Massa" ou "Para a calda".`,
    );
  }
  const isAllCaps = cleaned === cleaned.toUpperCase() && cleaned !== cleaned.toLowerCase();
  const casing = isAllCaps ? cleaned.toLowerCase() : cleaned;
  return `${casing.charAt(0).toUpperCase()}${casing.slice(1)}:`;
}

/**
 * Retorna o texto do subtítulo sem os dois-pontos finais, pronto para exibição.
 *
 * @example
 * readRecipeGroupHeadingTitle('Cobertura:'); // 'Cobertura'
 */
export function readRecipeGroupHeadingTitle(headingLine: string): string {
  return headingLine.trim().replace(/:+$/, '').trim();
}

/**
 * Conta apenas os itens reais (ignora subtítulos), usado nos contadores "3/8 separados".
 *
 * @example
 * countRecipeListItems(['Massa:', '2 ovos', 'Calda:', '1 xícara de açúcar']); // 2
 */
export function countRecipeListItems(lines: readonly string[]): number {
  return lines.filter((line) => !isRecipeGroupHeading(line)).length;
}

/**
 * Remove subtítulos órfãos e também remove um subtítulo único quando a seção inteira só tem 1 grupo.
 *
 * @example
 * sanitizeRecipeGroupHeadings(['Cobertura:', 'Derreta o chocolate']); // ['Derreta o chocolate']
 */
export function sanitizeRecipeGroupHeadings(lines: readonly string[]): string[] {
  const withoutDangling = lines.filter((line, index) => {
    if (!isRecipeGroupHeading(line)) return true;
    const nextLine = lines[index + 1];
    return nextLine !== undefined && !isRecipeGroupHeading(nextLine);
  });
  const blocks = groupRecipeListIntoBlocks(withoutDangling);
  if (blocks.length <= 1) {
    return withoutDangling.filter((line) => !isRecipeGroupHeading(line));
  }
  return withoutDangling;
}

/**
 * Agrupa uma lista em blocos por subtítulo, reconhecendo linhas "Massa:", prefixos "[Grupo]"
 * e sufixos repetidos "(Grupo)", numerando os itens de forma contínua.
 *
 * @example
 * const blocks = groupRecipeListIntoBlocks(['Massa:', 'Bata os ovos', 'Calda:', 'Derreta o açúcar']);
 * // blocks[1].heading === 'Calda' && blocks[1].items[0].displayNumber === 2
 */
export function groupRecipeListIntoBlocks(lines: readonly string[]): RecipeListBlock[] {
  const parenGroups = detectRepeatedParenGroups(lines);
  const blocks: Array<{ heading: string | null; items: RecipeListItemEntry[] }> = [];
  let itemCounter = 0;
  lines.forEach((line, sourceIndex) => {
    if (isRecipeGroupHeading(line)) {
      blocks.push({ heading: readRecipeGroupHeadingTitle(line), items: [] });
      return;
    }
    const inline = extractInlineGroupTag(line, parenGroups);
    itemCounter += 1;
    appendGroupedItem(blocks, inline.heading, {
      text: inline.text,
      sourceIndex,
      displayNumber: itemCounter,
    });
  });
  return blocks.filter((block) => block.items.length > 0);
}

function appendGroupedItem(
  blocks: Array<{ heading: string | null; items: RecipeListItemEntry[] }>,
  inlineHeading: string | null,
  entry: RecipeListItemEntry,
): void {
  const lastBlock = blocks[blocks.length - 1];
  const needsNewBlock =
    !lastBlock || (inlineHeading !== null && lastBlock.heading !== inlineHeading);
  if (needsNewBlock) {
    blocks.push({ heading: inlineHeading, items: [entry] });
    return;
  }
  lastBlock.items.push(entry);
}

function extractInlineGroupTag(
  line: string,
  repeatedParenGroups: ReadonlySet<string>,
): { heading: string | null; text: string } {
  const bracketMatch = line.match(BRACKET_PREFIX_PATTERN);
  if (bracketMatch) {
    return { heading: bracketMatch[1].trim(), text: bracketMatch[2].trim() };
  }
  const parenMatch = line.match(PAREN_SUFFIX_PATTERN);
  const parenLabel = parenMatch?.[2]?.trim().toLowerCase() ?? '';
  if (parenMatch && repeatedParenGroups.has(parenLabel)) {
    return { heading: parenMatch[2].trim(), text: parenMatch[1].trim() };
  }
  return { heading: null, text: line };
}

function detectRepeatedParenGroups(lines: readonly string[]): ReadonlySet<string> {
  const counts = new Map<string, number>();
  for (const line of lines) {
    const match = line.match(PAREN_SUFFIX_PATTERN);
    const key = match?.[2]?.trim().toLowerCase();
    if (key) counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  const hasMultiItemGroup = Array.from(counts.values()).some((count) => count >= 2);
  if (!hasMultiItemGroup || counts.size < 2) {
    return new Set();
  }
  return new Set(counts.keys());
}