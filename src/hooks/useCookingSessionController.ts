import { useEffect, useState } from 'react';
import {
  advanceTimerByOneSecond,
  CookingTimerSnapshot,
  createCookingTimerSnapshot,
} from '../services/cookingTimerEngine';

export interface CookingSessionController {
  readonly checkedIngredients: ReadonlySet<number>;
  readonly completedSteps: ReadonlySet<number>;
  readonly timerState: CookingTimerSnapshot;
  readonly targetServings: number;
  readonly toggleIngredient: (index: number) => void;
  readonly toggleStep: (index: number) => void;
  readonly toggleTimerPlayPause: () => void;
  readonly resetTimer: () => void;
  readonly addOneMinuteToTimer: () => void;
  readonly startCustomTimer: (seconds: number, label: string) => void;
  readonly adjustTargetServings: (delta: number) => void;
}

/**
 * Controla o estado interativo do Modo Cozinha (checklist de ingredientes, passos, porções e timer).
 *
 * @example
 * const session = useCookingSessionController(35, 4);
 */
export function useCookingSessionController(
  defaultPreparationMinutes: number,
  defaultServingsCount = 4,
): CookingSessionController {
  const [checkedIngredients, setCheckedIngredients] = useState<Set<number>>(new Set());
  const [completedSteps, setCompletedSteps] = useState<Set<number>>(new Set());
  const [targetServings, setTargetServings] = useState<number>(
    Math.max(1, defaultServingsCount),
  );
  const [timerState, setTimerState] = useState<CookingTimerSnapshot>(() =>
    createCookingTimerSnapshot(defaultPreparationMinutes * 60, 'Tempo Total da Receita'),
  );

  useEffect(() => {
    if (!timerState.isRunning) return;
    const intervalId = setInterval(() => {
      setTimerState((prev) => advanceTimerByOneSecond(prev));
    }, 1000);
    return () => clearInterval(intervalId);
  }, [timerState.isRunning]);

  return {
    checkedIngredients,
    completedSteps,
    timerState,
    targetServings,
    toggleIngredient: (idx) => setCheckedIngredients((prev) => toggleNumberInSet(prev, idx)),
    toggleStep: (idx) => setCompletedSteps((prev) => toggleNumberInSet(prev, idx)),
    toggleTimerPlayPause: () => setTimerState((t) => ({ ...t, isRunning: !t.isRunning })),
    resetTimer: () =>
      setTimerState((t) => ({ ...t, remainingSeconds: t.totalDurationSeconds, isRunning: false })),
    addOneMinuteToTimer: () =>
      setTimerState((t) => ({
        ...t,
        totalDurationSeconds: t.totalDurationSeconds + 60,
        remainingSeconds: t.remainingSeconds + 60,
      })),
    startCustomTimer: (secs, label) =>
      setTimerState({ ...createCookingTimerSnapshot(secs, label), isRunning: true }),
    adjustTargetServings: (delta) =>
      setTargetServings((prev) => Math.max(1, Math.min(50, prev + delta))),
  };
}

function toggleNumberInSet(sourceSet: ReadonlySet<number>, targetIndex: number): Set<number> {
  const updated = new Set(sourceSet);
  if (updated.has(targetIndex)) {
    updated.delete(targetIndex);
  } else {
    updated.add(targetIndex);
  }
  return updated;
}
