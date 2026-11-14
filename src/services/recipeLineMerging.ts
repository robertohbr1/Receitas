import { isRecipeGroupHeading } from './recipeGroupHeadings';

/**
 * Linha já limpa de uma seção, lembrando se tinha marcador (bullet/numeração) no texto original.
 */
export interface RecipeBucketEntry {
  readonly text: string;
  readonly hasListMarker: boolean;
}

const TRAILING_CONNECTOR_PATTERN =
  /(?:\s(?:de|da|do|das|dos|com|e|ou|para|em|a|o|ao|à|no|na|sem|até)|[,\-–])$/i;
const MIN_PARAGRAPH_LENGTH_TO_SPLIT = 100;
const MIN_SENTENCE_LENGTH = 12;

/**
 * Junta linhas de ingrediente quebradas no meio ("2 colheres de sopa de" + "manteiga").
 * Linhas minúsculas isoladas ("sal a gosto") continuam separadas.
 *
 * @example
 * mergeWrappedIngredientLines([{ text: '2 colheres de', hasListMarker: true }, { text: 'manteiga', hasListMarker: false }]);
 * // => [{ text: '2 colheres de manteiga', hasListMarker: true }]
 */
export function mergeWrappedIngredientLines(
  entries: readonly RecipeBucketEntry[],
): RecipeBucketEntry[] {
  return mergeEntriesWhen(entries, (previous) => TRAILING_CONNECTOR_PATTERN.test(previous.text));
}

/**
 * Junta passos quebrados pela largura da legenda: linha sem marcador que começa minúscula
 * (e cujo passo anterior não terminou com ponto) ou que segue um conector ("com", "de").
 *
 * @example
 * mergeWrappedStepLines([{ text: 'Derreta o chocolate com 2', hasListMarker: false }, { text: 'colheres de óleo', hasListMarker: false }]);
 * // => [{ text: 'Derreta o chocolate com 2 colheres de óleo', hasListMarker: false }]
 */
export function mergeWrappedStepLines(entries: readonly RecipeBucketEntry[]): RecipeBucketEntry[] {
  return mergeEntriesWhen(entries, (previous, current) => {
    const startsLowercase = /^[a-zà-ÿ]/.test(current.text);
    const previousIsOpen = !/[.!?]$/.test(previous.text);
    return (startsLowercase && previousIsOpen) || TRAILING_CONNECTOR_PATTERN.test(previous.text);
  });
}

function mergeEntriesWhen(
  entries: readonly RecipeBucketEntry[],
  shouldMerge: (previous: RecipeBucketEntry, current: RecipeBucketEntry) => boolean,
): RecipeBucketEntry[] {
  const merged: RecipeBucketEntry[] = [];
  for (const current of entries) {
    const previous = merged[merged.length - 1];
    if (previous && canBeMerged(previous, current) && shouldMerge(previous, current)) {
      merged[merged.length - 1] = { ...previous, text: `${previous.text} ${current.text}` };
      continue;
    }
    merged.push(current);
  }
  return merged;
}

function canBeMerged(previous: RecipeBucketEntry, current: RecipeBucketEntry): boolean {
  return (
    !current.hasListMarker &&
    !isRecipeGroupHeading(previous.text) &&
    !isRecipeGroupHeading(current.text)
  );
}

/**
 * Divide parágrafos longos sem numeração em um passo por frase, para que cada passo
 * tenha seu próprio checkbox e timer. Passos numerados pelo autor nunca são divididos.
 *
 * @example
 * splitLongStepParagraphs([{ text: 'Bata tudo no liquidificador por 5 minutos até ficar homogêneo. Despeje na forma untada e enfarinhada. Asse por 40 minutos.', hasListMarker: false }]);
 * // => 3 passos
 */
export function splitLongStepParagraphs(entries: readonly RecipeBucketEntry[]): RecipeBucketEntry[] {
  return entries.flatMap((entry) => {
    const isSplittable =
      !entry.hasListMarker &&
      entry.text.length >= MIN_PARAGRAPH_LENGTH_TO_SPLIT &&
      !isRecipeGroupHeading(entry.text);
    if (!isSplittable) return [entry];
    return splitParagraphIntoSentences(entry.text).map((text) => ({ text, hasListMarker: false }));
  });
}

/**
 * Quebra um parágrafo em frases terminadas por ". ! ?" seguidas de letra maiúscula,
 * juntando fragmentos muito curtos à frase anterior.
 *
 * @example
 * splitParagraphIntoSentences('Bata os ovos. Junte o açúcar aos poucos.');
 * // => ['Bata os ovos.', 'Junte o açúcar aos poucos.']
 */
export function splitParagraphIntoSentences(paragraph: string): string[] {
  // Sem lookbehind para manter compatibilidade com motores de regex mais antigos.
  const rawPieces = paragraph
    .replace(/([.!?])\s+(?=[A-ZÀ-ÖØ-Ý])/g, '$1\n')
    .split('\n')
    .map((piece) => piece.trim())
    .filter((piece) => piece.length > 0);
  const sentences: string[] = [];
  for (const piece of rawPieces) {
    const isTooShort = piece.length < MIN_SENTENCE_LENGTH && sentences.length > 0;
    if (isTooShort) {
      sentences[sentences.length - 1] = `${sentences[sentences.length - 1]} ${piece}`;
      continue;
    }
    sentences.push(piece);
  }
  return sentences;
}