import { findCookingDurationMentions } from './cookingDurationParser';

/**
 * Estado imutável do cronômetro integrado do Modo Cozinha.
 */
export interface CookingTimerSnapshot {
  readonly totalDurationSeconds: number;
  readonly remainingSeconds: number;
  readonly isRunning: boolean;
  readonly activeStepLabel: string;
}

/**
 * Extrai a duração em segundos mencionada em um passo da receita (ex: "Asse por 25 minutos").
 * Retorna null caso o passo não mencione nenhum tempo.
 *
 * @example
 * const seconds = detectStepDurationSeconds('Deixe dourar por 12 minutos em fogo baixo');
 * // seconds === 720
 */
export function detectStepDurationSeconds(stepText: string): number | null {
  // Soma a primeira menção em horas/minutos com a primeira em segundos para cobrir
  // passos como "Bata por 2 minutos e 30 segundos"; o formato "1h30" vem do parser compartilhado.
  const mentions = findCookingDurationMentions(stepText);
  const firstLongMention = mentions.find((mention) => !mention.isSecondsOnly);
  const firstSecondsMention = mentions.find((mention) => mention.isSecondsOnly);
  const totalSeconds =
    (firstLongMention?.totalSeconds ?? 0) + (firstSecondsMention?.totalSeconds ?? 0);
  return totalSeconds > 0 ? totalSeconds : null;
}

/**
 * Cria um estado inicial de timer para a duração informada em segundos.
 *
 * @example
 * const timer = createCookingTimerSnapshot(300, 'Passo 2: Descansar massa');
 * // timer.remainingSeconds === 300
 */
export function createCookingTimerSnapshot(
  durationSeconds: number,
  stepLabel: string,
): CookingTimerSnapshot {
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    throw new Error(
      `Duração inválida para o timer: ${durationSeconds}. Esperado: número inteiro positivo em segundos (> 0).`,
    );
  }
  const roundedSeconds = Math.floor(durationSeconds);
  return {
    totalDurationSeconds: roundedSeconds,
    remainingSeconds: roundedSeconds,
    isRunning: false,
    activeStepLabel: stepLabel.trim() || 'Timer Culinário',
  };
}

/**
 * Avança o cronômetro em 1 segundo caso esteja em execução e ainda haja tempo restante.
 *
 * @example
 * const next = advanceTimerByOneSecond({ totalDurationSeconds: 10, remainingSeconds: 5, isRunning: true, activeStepLabel: 'Forno' });
 * // next.remainingSeconds === 4
 */
export function advanceTimerByOneSecond(
  currentSnapshot: CookingTimerSnapshot,
): CookingTimerSnapshot {
  if (!currentSnapshot.isRunning || currentSnapshot.remainingSeconds <= 0) {
    return currentSnapshot;
  }
  const nextRemaining = currentSnapshot.remainingSeconds - 1;
  return {
    ...currentSnapshot,
    remainingSeconds: nextRemaining,
    isRunning: nextRemaining > 0,
  };
}

/**
 * Formata um total de segundos no padrão digital MM:SS (ou HH:MM:SS se >= 1 hora).
 *
 * @example
 * const formatted = formatCountdownClock(125);
 * // formatted === '02:05'
 */
export function formatCountdownClock(remainingSeconds: number): string {
  const safeSeconds = Math.max(0, Math.floor(remainingSeconds));
  const hours = Math.floor(safeSeconds / 3600);
  const minutes = Math.floor((safeSeconds % 3600) / 60);
  const seconds = safeSeconds % 60;
  const paddedMinutes = String(minutes).padStart(2, '0');
  const paddedSeconds = String(seconds).padStart(2, '0');
  return hours > 0 ? `${String(hours).padStart(2, '0')}:${paddedMinutes}:${paddedSeconds}` : `${paddedMinutes}:${paddedSeconds}`;
}