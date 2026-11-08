import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  detectStepDurationSeconds,
  formatCountdownClock,
} from '../services/cookingTimerEngine';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface CookingStepsWithTimerSectionProps {
  readonly steps: readonly string[];
  readonly completedSteps: ReadonlySet<number>;
  readonly palette: GastronomicColorPalette;
  readonly onToggleStepCompleted: (stepIndex: number) => void;
  readonly onStartStepTimer: (durationSeconds: number, stepLabel: string) => void;
}

/**
 * Lista passo a passo interativa que detecta tempos no texto e oferece botão de timer imediato.
 *
 * @example
 * <CookingStepsWithTimerSection steps={recipe.preparationSteps} completedSteps={done} ... />
 */
export function CookingStepsWithTimerSection(
  props: CookingStepsWithTimerSectionProps,
): React.ReactElement {
  const { steps, completedSteps, palette } = props;
  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          👩‍🍳 Modo de Preparo (Passo a Passo)
        </Text>
        <Text style={[styles.progressText, { color: palette.accentTerracotta }]}>
          {completedSteps.size}/{steps.length} concluídos
        </Text>
      </View>
      {steps.map((stepText, idx) => (
        <SingleCookingStepItem
          key={`${idx}-${stepText.slice(0, 18)}`}
          stepNumber={idx + 1}
          stepText={stepText}
          isCompleted={completedSteps.has(idx)}
          palette={palette}
          onToggleCompleted={() => props.onToggleStepCompleted(idx)}
          onStartStepTimer={props.onStartStepTimer}
        />
      ))}
    </View>
  );
}

function SingleCookingStepItem(props: {
  readonly stepNumber: number;
  readonly stepText: string;
  readonly isCompleted: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onToggleCompleted: () => void;
  readonly onStartStepTimer: (durationSeconds: number, stepLabel: string) => void;
}): React.ReactElement {
  const { stepNumber, stepText, isCompleted, palette } = props;
  const detectedSeconds = detectStepDurationSeconds(stepText);
  return (
    <View style={[styles.stepBox, { borderColor: palette.borderSubtle }]}>
      <TouchableOpacity onPress={props.onToggleCompleted} style={styles.stepTouchArea}>
        <View
          style={[
            styles.stepBadge,
            { backgroundColor: isCompleted ? palette.successOlive : palette.accentTerracotta },
          ]}
        >
          <Text style={styles.stepBadgeText}>{isCompleted ? '✓' : stepNumber}</Text>
        </View>
        <Text
          style={[
            styles.stepDescription,
            { color: isCompleted ? palette.textSecondary : palette.textPrimary },
            isCompleted && styles.completedText,
          ]}
        >
          {stepText}
        </Text>
      </TouchableOpacity>
      {detectedSeconds !== null && (
        <StepTimerTriggerButton
          detectedSeconds={detectedSeconds}
          stepNumber={stepNumber}
          palette={palette}
          onTrigger={props.onStartStepTimer}
        />
      )}
    </View>
  );
}

function StepTimerTriggerButton(props: {
  readonly detectedSeconds: number;
  readonly stepNumber: number;
  readonly palette: GastronomicColorPalette;
  readonly onTrigger: (durationSeconds: number, stepLabel: string) => void;
}): React.ReactElement {
  const { detectedSeconds, stepNumber, palette } = props;
  return (
    <TouchableOpacity
      onPress={() => props.onTrigger(detectedSeconds, `Passo ${stepNumber}`)}
      style={[styles.timerPill, { backgroundColor: palette.badgeBackground }]}
    >
      <Text style={[styles.timerPillText, { color: palette.accentTerracotta }]}>
        ⏱️ Iniciar Timer deste passo ({formatCountdownClock(detectedSeconds)})
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 12 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  progressText: { fontSize: 12, fontWeight: '700' },
  stepBox: { borderBottomWidth: 1, paddingVertical: 10 },
  stepTouchArea: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepBadge: { width: 26, height: 26, borderRadius: 13, justifyContent: 'center', alignItems: 'center', marginTop: 2 },
  stepBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  stepDescription: { flex: 1, fontSize: 15, lineHeight: 22 },
  completedText: { textDecorationLine: 'line-through' },
  timerPill: { alignSelf: 'flex-start', marginLeft: 36, marginTop: 8, paddingHorizontal: 12, paddingVertical: 6, borderRadius: 8 },
  timerPillText: { fontSize: 12, fontWeight: '700' },
});
