import {
  findCookingDurationMentions,
  parseDurationTextToMinutes,
} from '../src/services/cookingDurationParser';
import {
  advanceTimerByOneSecond,
  createCookingTimerSnapshot,
  detectStepDurationSeconds,
  formatCountdownClock,
} from '../src/services/cookingTimerEngine';

describe('cookingTimerEngine & cookingDurationParser', () => {
  it('detecta durações em horas, minutos, segundos e formatos compactos dentro de um passo', () => {
    expect(detectStepDurationSeconds('Asse em forno médio por 35 minutos.')).toBe(2100);
    expect(detectStepDurationSeconds('Cozinhe na pressão por 1 hora e 10 minutos')).toBe(4200);
    expect(detectStepDurationSeconds('Deixe descansar por 1h30 na geladeira')).toBe(5400);
    expect(detectStepDurationSeconds('Deixe marinar por meia hora')).toBe(1800);
    expect(detectStepDurationSeconds('Bata por 45 segundos')).toBe(45);
    expect(detectStepDurationSeconds('Tempere 5 hambúrgueres com sal a gosto')).toBeNull();
  });

  it('extrai múltiplas menções de duração e converte expressões em minutos', () => {
    const mentions = findCookingDurationMentions('Ferva por 10 min e asse por 1h15');
    expect(mentions.map((m) => m.totalSeconds)).toEqual([600, 4500]);
    expect(parseDurationTextToMinutes('1h30')).toBe(90);
    expect(parseDurationTextToMinutes('sem tempo')).toBeNull();
  });

  it('cria um snapshot válido de timer e rejeita durações não positivas', () => {
    const timer = createCookingTimerSnapshot(180, 'Passo 1');
    expect(timer.remainingSeconds).toBe(180);
    expect(timer.isRunning).toBe(false);
    expect(() => createCookingTimerSnapshot(0, 'Inválido')).toThrow(/Duração inválida/);
  });

  it('avança o timer em 1 segundo quando ativo e para automaticamente ao chegar em zero', () => {
    const running = {
      totalDurationSeconds: 2,
      remainingSeconds: 2,
      isRunning: true,
      activeStepLabel: 'Forno',
    };
    const afterOneTick = advanceTimerByOneSecond(running);
    expect(afterOneTick.remainingSeconds).toBe(1);
    expect(afterOneTick.isRunning).toBe(true);

    const afterSecondTick = advanceTimerByOneSecond(afterOneTick);
    expect(afterSecondTick.remainingSeconds).toBe(0);
    expect(afterSecondTick.isRunning).toBe(false);
  });

  it('formata segundos restantes em MM:SS ou HH:MM:SS', () => {
    expect(formatCountdownClock(65)).toBe('01:05');
    expect(formatCountdownClock(3661)).toBe('01:01:01');
    expect(formatCountdownClock(0)).toBe('00:00');
  });
});
