import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { scaleIngredientsList } from '../services/portionScaler';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface IngredientChecklistSectionProps {
  readonly ingredients: readonly string[];
  readonly checkedIndices: ReadonlySet<number>;
  readonly palette: GastronomicColorPalette;
  readonly baseServings?: number;
  readonly targetServings?: number;
  readonly onAdjustServings?: (delta: number) => void;
  readonly onToggleIngredientIndex: (index: number) => void;
}

/**
 * Checklist interativo de ingredientes com multiplicador proporcional de porções.
 *
 * @example
 * <IngredientChecklistSection ingredients={recipe.ingredients} checkedIndices={checked} ... />
 */
export function IngredientChecklistSection(
  props: IngredientChecklistSectionProps,
): React.ReactElement {
  const { ingredients, checkedIndices, palette } = props;
  const baseServings = props.baseServings ?? 4;
  const targetServings = props.targetServings ?? baseServings;
  const displayedIngredients = scaleIngredientsList(ingredients, baseServings, targetServings);
  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          🛒 Ingredientes
        </Text>
        <Text style={[styles.counterBadge, { color: palette.accentTerracotta }]}>
          {checkedIndices.size}/{ingredients.length} separados
        </Text>
      </View>
      {props.onAdjustServings && (
        <ServingsScalerBar
          baseServings={baseServings}
          targetServings={targetServings}
          palette={palette}
          onAdjust={props.onAdjustServings}
        />
      )}
      {displayedIngredients.map((ingredientText, idx) => (
        <SingleIngredientCheckRow
          key={`${idx}-${ingredientText}`}
          ingredientText={ingredientText}
          isChecked={checkedIndices.has(idx)}
          palette={palette}
          onPress={() => props.onToggleIngredientIndex(idx)}
        />
      ))}
    </View>
  );
}

function ServingsScalerBar(props: {
  readonly baseServings: number;
  readonly targetServings: number;
  readonly palette: GastronomicColorPalette;
  readonly onAdjust: (delta: number) => void;
}): React.ReactElement {
  const { palette, targetServings, baseServings } = props;
  return (
    <View style={[styles.scalerRow, { backgroundColor: palette.backgroundElevated }]}>
      <Text style={[styles.scalerLabel, { color: palette.textSecondary }]}>
        🥘 Rendimento: <Text style={{ color: palette.textPrimary, fontWeight: '800' }}>{targetServings} porções</Text>
        {targetServings !== baseServings ? ` (original: ${baseServings})` : ''}
      </Text>
      <View style={styles.scalerBtns}>
        <TouchableOpacity
          onPress={() => props.onAdjust(-1)}
          style={[styles.stepBtn, { borderColor: palette.borderSubtle }]}
        >
          <Text style={[styles.stepBtnText, { color: palette.textPrimary }]}>−</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={() => props.onAdjust(1)}
          style={[styles.stepBtn, { borderColor: palette.borderSubtle }]}
        >
          <Text style={[styles.stepBtnText, { color: palette.accentTerracotta }]}>+</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function SingleIngredientCheckRow(props: {
  readonly ingredientText: string;
  readonly isChecked: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onPress: () => void;
}): React.ReactElement {
  const { palette, isChecked, ingredientText } = props;
  return (
    <TouchableOpacity onPress={props.onPress} style={styles.itemRow} activeOpacity={0.7}>
      <Text style={styles.checkboxIcon}>{isChecked ? '✅' : '⬜'}</Text>
      <Text
        style={[
          styles.ingredientText,
          { color: isChecked ? palette.textSecondary : palette.textPrimary },
          isChecked && styles.strikethroughText,
        ]}
      >
        {ingredientText}
      </Text>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  counterBadge: { fontSize: 12, fontWeight: '700' },
  scalerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 10, paddingVertical: 8, borderRadius: 10, marginBottom: 10 },
  scalerLabel: { fontSize: 13 },
  scalerBtns: { flexDirection: 'row', gap: 6 },
  stepBtn: { width: 30, height: 28, borderRadius: 8, borderWidth: 1, alignItems: 'center', justifyContent: 'center' },
  stepBtnText: { fontSize: 16, fontWeight: '800' },
  itemRow: { flexDirection: 'row', alignItems: 'center', paddingVertical: 7, gap: 10 },
  checkboxIcon: { fontSize: 16 },
  ingredientText: { flex: 1, fontSize: 15, lineHeight: 21 },
  strikethroughText: { textDecorationLine: 'line-through' },
});
