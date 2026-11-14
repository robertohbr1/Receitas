/**
 * Uma menção de duração encontrada em um texto culinário (ex: "1h30", "40 minutos", "45 segundos").
 */
export interface CookingDurationMention {
  readonly totalSeconds: number;
  readonly isSecondsOnly: boolean;
}

// "h" só conta como hora quando não é início de palavra (evita "5 hambúrgueres") e
// aceita o formato compacto "1h30", em que não existe fronteira de palavra entre "h" e "30".
// Minutos separados por espaço exigem a unidade explícita para não capturar "2 horas e 3 ovos".
const HOUR_MINUTE_PATTERN =
  /(\d{1,2})\s*(?:h|hrs?|horas?)(?![a-zà-ÿ])(?:(\d{2})(?!\d)|\s*(?:e\s*)?(\d{1,2})\s*min(?:utos?|s)?(?![a-zà-ÿ]))?/gi;
const MINUTE_PATTERN = /(\d{1,3})\s*min(?:utos?|s)?(?![a-zà-ÿ])/gi;
const SECOND_PATTERN = /(\d{1,3})\s*seg(?:undos?|s)?(?![a-zà-ÿ])/gi;
const HALF_HOUR_PATTERN = /\bmeia\s+hora\b/gi;

/**
 * Localiza todas as menções de duração em um texto, na ordem em que aparecem.
 *
 * @example
 * const mentions = findCookingDurationMentions('Asse por 1h30 e descanse 10 minutos');
 * // mentions.map((m) => m.totalSeconds) === [5400, 600]
 */
export function findCookingDurationMentions(text: string): CookingDurationMention[] {
  const located: Array<{ index: number; mention: CookingDurationMention }> = [];
  const occupied: Array<[number, number]> = [];
  collectPatternMentions(text, HOUR_MINUTE_PATTERN, hourMinuteToSeconds, located, occupied);
  collectPatternMentions(text, HALF_HOUR_PATTERN, () => 1800, located, occupied);
  collectPatternMentions(text, MINUTE_PATTERN, (m) => Number(m[1]) * 60, located, occupied);
  collectPatternMentions(text, SECOND_PATTERN, (m) => Number(m[1]), located, occupied, true);
  return located.sort((a, b) => a.index - b.index).map((entry) => entry.mention);
}

function hourMinuteToSeconds(match: RegExpMatchArray): number {
  const hours = Number(match[1]);
  const minutes = Number(match[2] ?? match[3] ?? 0);
  return hours * 3600 + minutes * 60;
}

function collectPatternMentions(
  text: string,
  pattern: RegExp,
  toSeconds: (match: RegExpMatchArray) => number,
  located: Array<{ index: number; mention: CookingDurationMention }>,
  occupied: Array<[number, number]>,
  isSecondsOnly = false,
): void {
  for (const match of text.matchAll(pattern)) {
    const start = match.index ?? 0;
    const end = start + match[0].length;
    const overlaps = occupied.some(([s, e]) => start < e && end > s);
    const totalSeconds = toSeconds(match);
    if (overlaps || totalSeconds <= 0) continue;
    occupied.push([start, end]);
    located.push({ index: start, mention: { totalSeconds, isSecondsOnly } });
  }
}

/**
 * Converte um trecho de duração isolado ("1h30", "45 min", "meia hora") em minutos.
 * Retorna null quando o texto não contém duração reconhecível.
 *
 * @example
 * const minutes = parseDurationTextToMinutes('1 hora e 15 minutos');
 * // minutes === 75
 */
export function parseDurationTextToMinutes(durationText: string): number | null {
  const firstMention = findCookingDurationMentions(durationText).find(
    (mention) => !mention.isSecondsOnly,
  );
  return firstMention ? Math.round(firstMention.totalSeconds / 60) : null;
}