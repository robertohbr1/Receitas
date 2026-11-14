import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  detectStepDurationSeconds,
  formatCountdownClock,
} from '../services/cookingTimerEngine';
import { scaleIngredientsList } from '../services/portionScaler';
import {
  analyzeCookingStepComprehension,
  StepExecutionCues,
} from '../services/recipeComprehensionEnhancer';
import {
  countRecipeListItems,
  groupRecipeListIntoBlocks,
  RecipeListBlock,
  RecipeListItemEntry,
} from '../services/recipeGroupHeadings';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface CookingStepsWithTimerSectionProps {
  readonly steps: readonly string[];
  readonly completedSteps: ReadonlySet<number>;
  readonly palette: GastronomicColorPalette;
  readonly ingredients?: readonly string[];
  readonly baseServings?: number;
  readonly targetServings?: number;
  readonly onToggleStepCompleted: (stepIndex: number) => void;
  readonly onStartStepTimer: (durationSeconds: number, stepLabel: string) => void;
}

/**
 * Lista passo a passo interativa agrupada por etapa ("Massa", "Molho") com ingredientes
 * vinculados por etapa, dicas de ponto/temperatura, detecção de timer e Modo Passo Focado.
 *
 * @example
 * <CookingStepsWithTimerSection steps={recipe.preparationSteps} ingredients={recipe.ingredients} completedSteps={done} ... />
 */
export function CookingStepsWithTimerSection(
  props: CookingStepsWithTimerSectionProps,
): React.ReactElement {
  const { steps, completedSteps, palette } = props;
  const [isFocusedMode, setIsFocusedMode] = useState<boolean>(false);
  const [focusedCursor, setFocusedCursor] = useState<number>(0);

  const baseServings = props.baseServings ?? 4;
  const targetServings = props.targetServings ?? baseServings;
  const scaledIngredients = scaleIngredientsList(
    props.ingredients ?? [],
    baseServings,
    targetServings,
  );
  const blocks = groupRecipeListIntoBlocks(steps);
  const flatItems = blocks.flatMap((block) =>
    block.items.map((item) => ({ ...item, groupHeading: block.heading })),
  );
  const totalSteps = countRecipeListItems(steps);

  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <StepsHeaderToolbar
        completedCount={completedSteps.size}
        totalSteps={totalSteps}
        isFocusedMode={isFocusedMode}
        palette={palette}
        onToggleFocusedMode={() => setIsFocusedMode((prev) => !prev)}
      />
      {isFocusedMode && flatItems.length > 0 ? (
        <FocusedStepModeView
          items={flatItems}
          cursor={Math.min(focusedCursor, flatItems.length - 1)}
          completedSteps={completedSteps}
          scaledIngredients={scaledIngredients}
          palette={palette}
          onChangeCursor={setFocusedCursor}
          onToggleStepCompleted={props.onToggleStepCompleted}
          onStartStepTimer={props.onStartStepTimer}
        />
      ) : (
        blocks.map((block, blockIdx) => (
          <StepGroupBlockView
            key={`step-group-${blockIdx}-${block.heading ?? 'root'}`}
            block={block}
            completedSteps={completedSteps}
            scaledIngredients={scaledIngredients}
            palette={palette}
            onToggleStepCompleted={props.onToggleStepCompleted}
            onStartStepTimer={props.onStartStepTimer}
          />
        ))
      )}
    </View>
  );
}

function StepsHeaderToolbar(props: {
  readonly completedCount: number;
  readonly totalSteps: number;
  readonly isFocusedMode: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onToggleFocusedMode: () => void;
}): React.ReactElement {
  const { palette, isFocusedMode } = props;
  return (
    <View style={styles.headerRow}>
      <View style={{ flex: 1 }}>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          👩‍🍳 2. Modo de Preparo (Passo a Passo)
        </Text>
        <Text style={[styles.progressText, { color: palette.accentTerracotta }]}>
          {props.completedCount}/{props.totalSteps} etapas concluídas
        </Text>
      </View>
      <TouchableOpacity
        onPress={props.onToggleFocusedMode}
        style={[
          styles.modeToggleBtn,
          {
            backgroundColor: isFocusedMode ? palette.accentTerracotta : palette.backgroundElevated,
          },
        ]}
      >
        <Text
          style={[
            styles.modeToggleText,
            { color: isFocusedMode ? '#FFFFFF' : palette.textPrimary },
          ]}
        >
          {isFocusedMode ? '📋 Ver Todos' : '🎯 Passo a Passo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function FocusedStepModeView(props: {
  readonly items: ReadonlyArray<RecipeListItemEntry & { readonly groupHeading: string | null }>;
  readonly cursor: number;
  readonly completedSteps: ReadonlySet<number>;
  readonly scaledIngredients: readonly string[];
  readonly palette: GastronomicColorPalette;
  readonly onChangeCursor: (nextCursor: number) => void;
  readonly onToggleStepCompleted: (stepIndex: number) => void;
  readonly onStartStepTimer: (durationSeconds: number, stepLabel: string) => void;
}): React.ReactElement {
  const { items, cursor, completedSteps, scaledIngredients, palette } = props;
  const activeItem = items[cursor];
  const isCompleted = completedSteps.has(activeItem.sourceIndex);
  const cues = analyzeCookingStepComprehension(activeItem.text, scaledIngredients);
  const detectedSeconds = detectStepDurationSeconds(activeItem.text);

  const handleCompleteAndAdvance = (): void => {
    if (!isCompleted) {
      props.onToggleStepCompleted(activeItem.sourceIndex);
    }
    if (cursor < items.length - 1) {
      props.onChangeCursor(cursor + 1);
    }
  };

  return (
    <View style={[styles.focusedCard, { backgroundColor: palette.backgroundElevated }]}>
      <View style={styles.focusedTopRow}>
        <Text style={[styles.focusedCounter, { color: palette.accentTerracotta }]}>
          PASSO {activeItem.displayNumber} DE {items.length}
          {activeItem.groupHeading ? ` • ${activeItem.groupHeading.toUpperCase()}` : ''}
        </Text>
        {isCompleted && (
          <Text style={[styles.doneTag, { color: palette.successOlive }]}>✓ Concluído</Text>
        )}
      </View>
      <Text style={[styles.focusedStepText, { color: palette.textPrimary }]}>
        {activeItem.text}
      </Text>
      <StepComprehensionBadgesView cues={cues} palette={palette} />
      {detectedSeconds !== null && (
        <StepTimerTriggerButton
          detectedSeconds={detectedSeconds}
          stepNumber={activeItem.displayNumber}
          palette={palette}
          onTrigger={props.onStartStepTimer}
        />
      )}
      <View style={styles.focusedNavRow}>
        <TouchableOpacity
          disabled={cursor === 0}
          onPress={() => props.onChangeCursor(Math.max(0, cursor - 1))}
          style={[
            styles.navStepBtn,
            { borderColor: palette.borderSubtle, opacity: cursor === 0 ? 0.4 : 1 },
          ]}
        >
          <Text style={[styles.navStepBtnText, { color: palette.textPrimary }]}>← Anterior</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={handleCompleteAndAdvance}
          style={[styles.primaryStepBtn, { backgroundColor: palette.accentTerracotta }]}
        >
          <Text style={styles.primaryStepBtnText}>
            {cursor < items.length - 1 ? '✓ Concluir e Próximo →' : '✓ Finalizar Receita'}
          </Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function StepGroupBlockView(props: {
  readonly block: RecipeListBlock;
  readonly completedSteps: ReadonlySet<number>;
  readonly scaledIngredients: readonly string[];
  readonly palette: GastronomicColorPalette;
  readonly onToggleStepCompleted: (stepIndex: number) => void;
  readonly onStartStepTimer: (durationSeconds: number, stepLabel: string) => void;
}): React.ReactElement {
  const { block, completedSteps, scaledIngredients, palette } = props;
  return (
    <View style={styles.groupBlock}>
      {block.heading && (
        <View style={[styles.groupHeaderPill, { backgroundColor: palette.badgeBackground }]}>
          <Text style={[styles.groupHeaderText, { color: palette.accentTerracotta }]}>
            🔥 {block.heading}
          </Text>
        </View>
      )}
      {block.items.map((item) => (
        <SingleCookingStepItem
          key={`${item.sourceIndex}-${item.text.slice(0, 18)}`}
          stepNumber={item.displayNumber}
          stepText={item.text}
          isCompleted={completedSteps.has(item.sourceIndex)}
          scaledIngredients={scaledIngredients}
          palette={palette}
          onToggleCompleted={() => props.onToggleStepCompleted(item.sourceIndex)}
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
  readonly scaledIngredients: readonly string[];
  readonly palette: GastronomicColorPalette;
  readonly onToggleCompleted: () => void;
  readonly onStartStepTimer: (durationSeconds: number, stepLabel: string) => void;
}): React.ReactElement {
  const { stepNumber, stepText, isCompleted, scaledIngredients, palette } = props;
  const detectedSeconds = detectStepDurationSeconds(stepText);
  const cues = analyzeCookingStepComprehension(stepText, scaledIngredients);
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
        <View style={{ flex: 1 }}>
          <Text
            style={[
              styles.stepDescription,
              { color: isCompleted ? palette.textSecondary : palette.textPrimary },
              isCompleted && styles.completedText,
            ]}
          >
            {stepText}
          </Text>
          {!isCompleted && <StepComprehensionBadgesView cues={cues} palette={palette} />}
        </View>
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

function StepComprehensionBadgesView(props: {
  readonly cues: StepExecutionCues;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement | null {
  const { cues, palette } = props;
  const hasCues =
    cues.matchedIngredients.length > 0 ||
    cues.actionVerbBadge !== null ||
    cues.heatOrTemperatureCue !== null ||
    cues.visualDonenessCue !== null;
  if (!hasCues) return null;

  return (
    <View style={styles.cuesContainer}>
      <View style={styles.cuesPillsRow}>
        {cues.actionVerbBadge && (
          <View style={[styles.cueBadge, { backgroundColor: palette.backgroundElevated }]}>
            <Text style={[styles.cueBadgeText, { color: palette.textPrimary }]}>
              {cues.actionVerbBadge}
            </Text>
          </View>
        )}
        {cues.heatOrTemperatureCue && (
          <View style={[styles.cueBadge, { backgroundColor: palette.badgeBackground }]}>
            <Text style={[styles.cueBadgeText, { color: palette.accentTerracotta }]}>
              🌡️ {cues.heatOrTemperatureCue}
            </Text>
          </View>
        )}
        {cues.visualDonenessCue && (
          <View style={[styles.cueBadge, { backgroundColor: palette.backgroundElevated }]}>
            <Text style={[styles.cueBadgeText, { color: palette.successOlive }]}>
              👀 Ponto: {cues.visualDonenessCue}
            </Text>
          </View>
        )}
      </View>
      {cues.matchedIngredients.length > 0 && (
        <View style={[styles.stepIngredientsBox, { backgroundColor: palette.badgeBackground }]}>
          <Text style={[styles.stepIngredientsLabel, { color: palette.accentTerracotta }]}>
            🥣 Nesta etapa: {cues.matchedIngredients.join(' • ')}
          </Text>
        </View>
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
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 12,
    gap: 8,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  progressText: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  modeToggleBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  modeToggleText: { fontSize: 12, fontWeight: '700' },
  focusedCard: { borderRadius: 12, padding: 14, marginTop: 4 },
  focusedTopRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 8,
  },
  focusedCounter: { fontSize: 12, fontWeight: '800' },
  doneTag: { fontSize: 12, fontWeight: '800' },
  focusedStepText: { fontSize: 18, lineHeight: 26, fontWeight: '600', marginBottom: 8 },
  focusedNavRow: { flexDirection: 'row', gap: 10, marginTop: 14 },
  navStepBtn: { paddingVertical: 10, paddingHorizontal: 14, borderRadius: 10, borderWidth: 1 },
  navStepBtnText: { fontSize: 13, fontWeight: '700' },
  primaryStepBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryStepBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '800' },
  groupBlock: { marginTop: 4 },
  groupHeaderPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 8,
    marginBottom: 2,
  },
  groupHeaderText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  stepBox: { borderBottomWidth: 1, paddingVertical: 10 },
  stepTouchArea: { flexDirection: 'row', alignItems: 'flex-start', gap: 10 },
  stepBadge: {
    width: 26,
    height: 26,
    borderRadius: 13,
    justifyContent: 'center',
    alignItems: 'center',
    marginTop: 2,
  },
  stepBadgeText: { color: '#FFFFFF', fontWeight: '700', fontSize: 13 },
  stepDescription: { flex: 1, fontSize: 15, lineHeight: 22 },
  completedText: { textDecorationLine: 'line-through' },
  cuesContainer: { marginTop: 6, gap: 6 },
  cuesPillsRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  cueBadge: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 6 },
  cueBadgeText: { fontSize: 11, fontWeight: '700' },
  stepIngredientsBox: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  stepIngredientsLabel: { fontSize: 12, fontWeight: '700', lineHeight: 17 },
  timerPill: {
    alignSelf: 'flex-start',
    marginLeft: 36,
    marginTop: 8,
    paddingHorizontal: 12,
    paddingVertical: 6,
    borderRadius: 8,
  },
  timerPillText: { fontSize: 12, fontWeight: '700' },
});