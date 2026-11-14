import { findCookingDurationMentions, parseDurationTextToMinutes } from './cookingDurationParser';

/**
 * Tempo usado quando o texto não menciona nenhuma duração (sentinela conhecida pelos parsers sociais).
 */
export const DEFAULT_PREPARATION_MINUTES = 30;
/**
 * Rendimento usado quando o texto não menciona porções.
 */
export const DEFAULT_SERVINGS_COUNT = 4;

const MAX_TOTAL_MINUTES = 24 * 60;
const MAX_SERVINGS = 100;
const LABELED_TOTAL_TIME_PATTERN =
  /(?:tempo\s+(?:total|de\s+preparo)(?:\s+total)?|tempo|pronto\s+em|fica\s+pronto\s+em)\s*[:\-–]?\s*(\d[^\n]{0,30})/i;
const SERVING_UNITS =
  'por[cç](?:[oõ]es|[aã]o)|pessoas|fatias|unidades|peda[cç]os|bolinhos|copos|potes|ta[cç]as|picol[eé]s|docinhos|brigadeiros|cookies|p[aã]es|bombons|cupcakes|mini\\s+[a-zà-ÿ]+';
// "porção" fica de fora do rótulo: "Cada porção 250 kcal" não é rendimento (use "N porções").
const LABELED_SERVINGS_PATTERN = new RegExp(
  `(?:rendimento|rende|serve)\\s*[:\\-–]?\\s*(?:aproximadamente\\s+|cerca\\s+de\\s+|at[eé]\\s+)?(\\d{1,3})`,
  'i',
);
const UNIT_SERVINGS_PATTERN = new RegExp(`(\\d{1,3})\\s*(?:a\\s*\\d{1,3}\\s*)?(?:${SERVING_UNITS})\\b`, 'i');
const PERSON_SERVINGS_PATTERN = /(\d{1,3})\s*(?:a\s*\d{1,3}\s*)?(?:por[cç][oõ]es|pessoas|fatias|peda[cç]os)\b/i;

/**
 * Extrai o tempo de preparo em minutos: usa o "Tempo de preparo/total" quando declarado;
 * caso contrário soma as durações citadas nos passos (forno, geladeira...).
 *
 * @example
 * extractPreparationMinutesFromText('Tempo de preparo: 1h30'); // 90
 * extractPreparationMinutesFromText('Cozinhe por 10 minutos. Asse por 35 minutos.'); // 45
 */
export function extractPreparationMinutesFromText(text: string): number {
  const labeledMinutes = extractLabeledTotalMinutes(text);
  if (labeledMinutes !== null) {
    return labeledMinutes;
  }
  const summedMinutes = findCookingDurationMentions(text)
    .filter((mention) => !mention.isSecondsOnly)
    .reduce((total, mention) => total + mention.totalSeconds / 60, 0);
  if (summedMinutes <= 0) {
    return DEFAULT_PREPARATION_MINUTES;
  }
  return Math.max(1, Math.min(MAX_TOTAL_MINUTES, Math.round(summedMinutes)));
}

function extractLabeledTotalMinutes(text: string): number | null {
  const match = text.match(LABELED_TOTAL_TIME_PATTERN);
  if (!match || !match[1]) {
    return null;
  }
  const minutes = parseDurationTextToMinutes(match[1]);
  return minutes !== null && minutes > 0 ? Math.min(MAX_TOTAL_MINUTES, minutes) : null;
}

/**
 * Extrai a quantidade de porções: prioriza "Rende/Rendimento/Serve N", depois "N porções/pessoas",
 * e por último "para N unidades" (evitando confundir com "3 unidades de tomate").
 *
 * @example
 * extractServingsFromText('Rendimento: 8 porções'); // 8
 */
export function extractServingsFromText(text: string): number {
  const forUnitsPattern = new RegExp(`\\bpara\\s+${UNIT_SERVINGS_PATTERN.source}`, 'i');
  const candidates = [LABELED_SERVINGS_PATTERN, PERSON_SERVINGS_PATTERN, forUnitsPattern];
  for (const pattern of candidates) {
    const match = text.match(pattern);
    const servings = match && match[1] ? parseInt(match[1], 10) : 0;
    if (servings > 0) {
      return Math.min(MAX_SERVINGS, servings);
    }
  }
  return DEFAULT_SERVINGS_COUNT;
}