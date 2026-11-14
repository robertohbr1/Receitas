import React, { useState } from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { scaleIngredientsList } from '../services/portionScaler';
import {
  formatMissingIngredientsShoppingList,
  parseStructuredIngredientLine,
} from '../services/recipeComprehensionEnhancer';
import {
  countRecipeListItems,
  groupRecipeListIntoBlocks,
  RecipeListBlock,
} from '../services/recipeGroupHeadings';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface IngredientChecklistSectionProps {
  readonly ingredients: readonly string[];
  readonly checkedIndices: ReadonlySet<number>;
  readonly palette: GastronomicColorPalette;
  readonly baseServings?: number;
  readonly targetServings?: number;
  readonly recipeTitle?: string;
  readonly onAdjustServings?: (delta: number) => void;
  readonly onToggleIngredientIndex: (index: number) => void;
  readonly onCopyShoppingList?: (formattedList: string) => void;
}

/**
 * Checklist interativo de ingredientes (Mise en Place) com decomposição visual
 * (Quantidade, Ingrediente e Corte/Preparo Prévio), subgrupos e multiplicador de porções.
 *
 * @example
 * <IngredientChecklistSection ingredients={recipe.ingredients} checkedIndices={checked} ... />
 */
export function IngredientChecklistSection(
  props: IngredientChecklistSectionProps,
): React.ReactElement {
  const { ingredients, checkedIndices, palette } = props;
  const [copiedShopping, setCopiedShopping] = useState<boolean>(false);
  const baseServings = props.baseServings ?? 4;
  const targetServings = props.targetServings ?? baseServings;
  const displayedIngredients = scaleIngredientsList(ingredients, baseServings, targetServings);
  const blocks = groupRecipeListIntoBlocks(displayedIngredients);
  const totalItems = countRecipeListItems(ingredients);

  const handleCopyShopping = (): void => {
    if (!props.onCopyShoppingList) return;
    const text = formatMissingIngredientsShoppingList(
      props.recipeTitle ?? 'Receita',
      displayedIngredients,
      checkedIndices,
    );
    props.onCopyShoppingList(text);
    setCopiedShopping(true);
    setTimeout(() => setCopiedShopping(false), 2000);
  };

  return (
    <View
      style={[
        styles.sectionCard,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <IngredientSectionHeader
        checkedCount={checkedIndices.size}
        totalItems={totalItems}
        copiedShopping={copiedShopping}
        palette={palette}
        onCopyShopping={props.onCopyShoppingList ? handleCopyShopping : undefined}
      />
      <Text style={[styles.miseEnPlaceHint, { color: palette.textSecondary }]}>
        💡 Dica de Bancada: separe e corte os itens marcados com preparo prévio antes de ligar o
        fogo. Toque em cada item para marcar como separado.
      </Text>
      {props.onAdjustServings && (
        <ServingsScalerBar
          baseServings={baseServings}
          targetServings={targetServings}
          palette={palette}
          onAdjust={props.onAdjustServings}
        />
      )}
      {blocks.map((block, blockIdx) => (
        <IngredientGroupBlockView
          key={`group-${blockIdx}-${block.heading ?? 'root'}`}
          block={block}
          checkedIndices={checkedIndices}
          palette={palette}
          onToggleIngredientIndex={props.onToggleIngredientIndex}
        />
      ))}
    </View>
  );
}

function IngredientSectionHeader(props: {
  readonly checkedCount: number;
  readonly totalItems: number;
  readonly copiedShopping: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onCopyShopping?: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.headerRow}>
      <View>
        <Text style={[styles.sectionTitle, { color: palette.textPrimary }]}>
          🛒 1. Ingredientes (Mise en Place)
        </Text>
        <Text style={[styles.counterBadge, { color: palette.accentTerracotta }]}>
          {props.checkedCount}/{props.totalItems} separados na bancada
        </Text>
      </View>
      {props.onCopyShopping && (
        <TouchableOpacity
          onPress={props.onCopyShopping}
          style={[styles.copyShoppingBtn, { backgroundColor: palette.backgroundElevated }]}
        >
          <Text style={[styles.copyShoppingText, { color: palette.textPrimary }]}>
            {props.copiedShopping ? '✅ Lista Copiada!' : '📋 Copiar Faltantes'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function IngredientGroupBlockView(props: {
  readonly block: RecipeListBlock;
  readonly checkedIndices: ReadonlySet<number>;
  readonly palette: GastronomicColorPalette;
  readonly onToggleIngredientIndex: (index: number) => void;
}): React.ReactElement {
  const { block, checkedIndices, palette } = props;
  return (
    <View style={styles.groupBlock}>
      {block.heading && (
        <View style={[styles.groupHeaderPill, { backgroundColor: palette.badgeBackground }]}>
          <Text style={[styles.groupHeaderText, { color: palette.accentTerracotta }]}>
            🥣 {block.heading}
          </Text>
        </View>
      )}
      {block.items.map((item) => (
        <SingleIngredientCheckRow
          key={`${item.sourceIndex}-${item.text}`}
          ingredientText={item.text}
          isChecked={checkedIndices.has(item.sourceIndex)}
          palette={palette}
          onPress={() => props.onToggleIngredientIndex(item.sourceIndex)}
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
        🥘 Rendimento:{' '}
        <Text style={{ color: palette.textPrimary, fontWeight: '800' }}>
          {targetServings} porções
        </Text>
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
  const structured = parseStructuredIngredientLine(ingredientText);
  return (
    <TouchableOpacity onPress={props.onPress} style={styles.itemRow} activeOpacity={0.7}>
      <Text style={styles.checkboxIcon}>{isChecked ? '✅' : '⬜'}</Text>
      <View style={styles.structuredContent}>
        <View style={styles.mainIngredientLine}>
          {structured.quantityAndUnit && (
            <View
              style={[
                styles.qtyBadge,
                { backgroundColor: isChecked ? palette.backgroundElevated : palette.badgeBackground },
              ]}
            >
              <Text
                style={[
                  styles.qtyBadgeText,
                  { color: isChecked ? palette.textSecondary : palette.accentTerracotta },
                ]}
              >
                {structured.quantityAndUnit}
              </Text>
            </View>
          )}
          <Text
            style={[
              styles.ingredientText,
              { color: isChecked ? palette.textSecondary : palette.textPrimary },
              isChecked && styles.strikethroughText,
            ]}
          >
            {structured.ingredientName}
          </Text>
        </View>
        {structured.preparationHint && (
          <View style={[styles.prepHintPill, { backgroundColor: palette.backgroundElevated }]}>
            <Text style={[styles.prepHintText, { color: palette.textSecondary }]}>
              🔪 Preparo prévio: {structured.preparationHint}
            </Text>
          </View>
        )}
      </View>
    </TouchableOpacity>
  );
}

const styles = StyleSheet.create({
  sectionCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
  },
  sectionTitle: { fontSize: 17, fontWeight: '700' },
  counterBadge: { fontSize: 12, fontWeight: '700', marginTop: 2 },
  copyShoppingBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  copyShoppingText: { fontSize: 12, fontWeight: '700' },
  miseEnPlaceHint: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  scalerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 10,
    paddingVertical: 8,
    borderRadius: 10,
    marginBottom: 10,
  },
  scalerLabel: { fontSize: 13 },
  scalerBtns: { flexDirection: 'row', gap: 6 },
  stepBtn: {
    width: 30,
    height: 28,
    borderRadius: 8,
    borderWidth: 1,
    alignItems: 'center',
    justifyContent: 'center',
  },
  stepBtnText: { fontSize: 16, fontWeight: '800' },
  groupBlock: { marginTop: 4 },
  groupHeaderPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 10,
    paddingVertical: 4,
    borderRadius: 8,
    marginTop: 6,
    marginBottom: 4,
  },
  groupHeaderText: { fontSize: 12, fontWeight: '800', textTransform: 'uppercase' },
  itemRow: { flexDirection: 'row', alignItems: 'flex-start', paddingVertical: 7, gap: 10 },
  checkboxIcon: { fontSize: 16, marginTop: 2 },
  structuredContent: { flex: 1 },
  mainIngredientLine: { flexDirection: 'row', flexWrap: 'wrap', alignItems: 'center', gap: 6 },
  qtyBadge: { paddingHorizontal: 8, paddingVertical: 2, borderRadius: 6 },
  qtyBadgeText: { fontSize: 13, fontWeight: '800' },
  ingredientText: { flexShrink: 1, fontSize: 15, lineHeight: 21, fontWeight: '600' },
  strikethroughText: { textDecorationLine: 'line-through' },
  prepHintPill: {
    alignSelf: 'flex-start',
    paddingHorizontal: 8,
    paddingVertical: 2,
    borderRadius: 6,
    marginTop: 4,
  },
  prepHintText: { fontSize: 11, fontWeight: '600' },
});