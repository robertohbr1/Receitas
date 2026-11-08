import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  CookingTimerSnapshot,
  formatCountdownClock,
} from '../services/cookingTimerEngine';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface FloatingCookingTimerBarProps {
  readonly timerSnapshot: CookingTimerSnapshot;
  readonly palette: GastronomicColorPalette;
  readonly onTogglePlayPause: () => void;
  readonly onResetTimer: () => void;
  readonly onAddOneMinute: () => void;
  readonly onSelectPresetMinutes: (minutes: number) => void;
}

/**
 * Painel de cronômetro culinário integrado para acompanhar cozimento ou forno sem sair da receita.
 *
 * @example
 * <FloatingCookingTimerBar timerSnapshot={timer} palette={palette} onTogglePlayPause={toggle} ... />
 */
export function FloatingCookingTimerBar(
  props: FloatingCookingTimerBarProps,
): React.ReactElement {
  const { timerSnapshot, palette } = props;
  const isFinished = timerSnapshot.remainingSeconds === 0;
  return (
    <View
      style={[
        styles.timerContainer,
        { backgroundColor: palette.backgroundElevated, borderColor: palette.accentTerracotta },
      ]}
    >
      <TimerDisplayHeader
        timerSnapshot={timerSnapshot}
        isFinished={isFinished}
        palette={palette}
      />
      <TimerActionButtonsRow
        isRunning={timerSnapshot.isRunning}
        palette={palette}
        onTogglePlayPause={props.onTogglePlayPause}
        onAddOneMinute={props.onAddOneMinute}
        onResetTimer={props.onResetTimer}
        onSelectPresetMinutes={props.onSelectPresetMinutes}
      />
    </View>
  );
}

function TimerDisplayHeader(props: {
  readonly timerSnapshot: CookingTimerSnapshot;
  readonly isFinished: boolean;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { timerSnapshot, isFinished, palette } = props;
  return (
    <View style={styles.topRow}>
      <View>
        <Text style={[styles.timerLabel, { color: palette.textSecondary }]}>
          ⏲️ {timerSnapshot.activeStepLabel}
        </Text>
        <Text
          style={[
            styles.clockDigits,
            { color: isFinished ? palette.successOlive : palette.accentTerracotta },
          ]}
        >
          {formatCountdownClock(timerSnapshot.remainingSeconds)}
          {isFinished ? ' (Pronto! 🔔)' : ''}
        </Text>
      </View>
    </View>
  );
}

function TimerActionButtonsRow(props: {
  readonly isRunning: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onTogglePlayPause: () => void;
  readonly onAddOneMinute: () => void;
  readonly onResetTimer: () => void;
  readonly onSelectPresetMinutes: (minutes: number) => void;
}): React.ReactElement {
  const { palette, isRunning } = props;
  return (
    <View style={styles.controlsRow}>
      <TouchableOpacity
        onPress={props.onTogglePlayPause}
        style={[styles.primaryBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.primaryBtnText}>{isRunning ? '⏸ Pausar' : '▶️ Iniciar'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={props.onAddOneMinute}
        style={[styles.secondaryBtn, { backgroundColor: palette.backgroundCard }]}
      >
        <Text style={[styles.secondaryBtnText, { color: palette.textPrimary }]}>+1 min</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={props.onResetTimer}
        style={[styles.secondaryBtn, { backgroundColor: palette.backgroundCard }]}
      >
        <Text style={[styles.secondaryBtnText, { color: palette.textPrimary }]}>↺ Zerar</Text>
      </TouchableOpacity>
      {[5, 15].map((mins) => (
        <TouchableOpacity
          key={mins}
          onPress={() => props.onSelectPresetMinutes(mins)}
          style={[styles.secondaryBtn, { backgroundColor: palette.backgroundCard }]}
        >
          <Text style={[styles.secondaryBtnText, { color: palette.accentTerracotta }]}>
            {mins}m
          </Text>
        </TouchableOpacity>
      ))}
    </View>
  );
}

const styles = StyleSheet.create({
  timerContainer: { borderRadius: 14, borderWidth: 1.5, padding: 12, marginBottom: 16 },
  topRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 8 },
  timerLabel: { fontSize: 12, fontWeight: '600' },
  clockDigits: { fontSize: 24, fontWeight: '800', letterSpacing: 1 },
  controlsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  primaryBtn: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 8 },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  secondaryBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  secondaryBtnText: { fontWeight: '600', fontSize: 12 },
});
