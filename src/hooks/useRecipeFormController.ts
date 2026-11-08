import { useState } from 'react';
import {
  resolveSocialRecipeDraftFromUrl,
  YoutubeVideoMetadataGateway,
} from '../adapters/youtubeMetadataGateway';
import { splitIntoNonEmptyLines } from '../services/recipeTextParser';
import {
  CulinaryCategory,
  CulinaryRecipeRecord,
  DifficultyLevel,
  ParsedRecipeTextResult,
  RecipeDraftInput,
} from '../types/recipeTypes';

export interface RecipeFormStateValues {
  readonly title: string;
  readonly category: Exclude<CulinaryCategory, 'Todas'>;
  readonly difficulty: DifficultyLevel;
  readonly prepMinutes: string;
  readonly servings: string;
  readonly coverUri: string;
  readonly videoUri: string;
  readonly ingredientsText: string;
  readonly stepsText: string;
  readonly unifiedNotes: string;
  readonly tagsText: string;
  readonly isImportOpen: boolean;
  readonly isFetchingYoutube: boolean;
  readonly validationError: string | null;
}

export interface RecipeFormController {
  readonly values: RecipeFormStateValues;
  readonly updateField: <K extends keyof RecipeFormStateValues>(
    field: K,
    value: RecipeFormStateValues[K],
  ) => void;
  readonly applyImportedRecipe: (parsed: ParsedRecipeTextResult) => void;
  readonly applyYoutubeDraft: (draft: RecipeDraftInput) => void;
  readonly fetchAndFillFromYoutubeUrl: (
    youtubeUrl: string,
    youtubeGateway: YoutubeVideoMetadataGateway,
  ) => Promise<RecipeDraftInput | null>;
  readonly submitDraft: (onSave: (draft: RecipeDraftInput) => Promise<void>) => Promise<void>;
}

/**
 * Gerencia os campos editáveis do formulário de receita e a importação automática via YouTube ou texto.
 *
 * @example
 * const form = useRecipeFormController(initialRecipe);
 */
export function useRecipeFormController(
  initialRecipe: CulinaryRecipeRecord | null,
): RecipeFormController {
  const [values, setValues] = useState<RecipeFormStateValues>(() =>
    createInitialFormValues(initialRecipe),
  );

  const updateField = <K extends keyof RecipeFormStateValues>(
    field: K,
    value: RecipeFormStateValues[K],
  ): void => {
    setValues((prev) => ({ ...prev, [field]: value }));
  };

  return {
    values,
    updateField,
    applyImportedRecipe: (parsed) => setValues((prev) => mergeParsedRecipeIntoForm(prev, parsed)),
    applyYoutubeDraft: (draft) => setValues((prev) => mergeYoutubeDraftIntoForm(prev, draft)),
    fetchAndFillFromYoutubeUrl: (url, gateway) =>
      executeYoutubeAutoFill(url, gateway, setValues, updateField),
    submitDraft: (onSave) => executeFormSubmit(values, onSave, updateField),
  };
}

function createInitialFormValues(
  existing: CulinaryRecipeRecord | null,
): RecipeFormStateValues {
  return {
    title: existing?.title ?? '',
    category: existing?.category ?? 'Massas',
    difficulty: existing?.difficulty ?? 'Fácil',
    prepMinutes: String(existing?.preparationMinutes ?? 30),
    servings: String(existing?.servingsCount ?? 4),
    coverUri: existing?.coverImageUri ?? '',
    videoUri: existing?.videoSourceUri ?? '',
    ingredientsText: existing ? existing.ingredients.join('\n') : '',
    stepsText: existing ? existing.preparationSteps.join('\n') : '',
    unifiedNotes: existing?.unifiedChefNotesAndNutrition ?? '',
    tagsText: existing ? existing.tags.join(', ') : '',
    isImportOpen: false,
    isFetchingYoutube: false,
    validationError: null,
  };
}

async function executeYoutubeAutoFill(
  socialUrl: string,
  youtubeGateway: YoutubeVideoMetadataGateway,
  setValues: React.Dispatch<React.SetStateAction<RecipeFormStateValues>>,
  updateField: <K extends keyof RecipeFormStateValues>(
    field: K,
    value: RecipeFormStateValues[K],
  ) => void,
): Promise<RecipeDraftInput | null> {
  updateField('isFetchingYoutube', true);
  updateField('validationError', null);
  try {
    const draft = await resolveSocialRecipeDraftFromUrl(socialUrl, youtubeGateway);
    setValues((prev) => mergeYoutubeDraftIntoForm(prev, draft));
    return draft;
  } catch (err) {
    updateField('isFetchingYoutube', false);
    updateField('validationError', err instanceof Error ? err.message : 'Erro ao ler link');
    return null;
  }
}

/**
 * Aplica um rascunho extraído de vídeo do YouTube a todos os campos do estado do formulário.
 *
 * @example
 * const nextState = mergeYoutubeDraftIntoForm(currentValues, youtubeDraft);
 */
export function mergeYoutubeDraftIntoForm(
  current: RecipeFormStateValues,
  draft: RecipeDraftInput,
): RecipeFormStateValues {
  return {
    ...current,
    title: draft.title,
    category: draft.category,
    difficulty: draft.difficulty,
    prepMinutes: String(draft.preparationMinutes),
    servings: String(draft.servingsCount),
    coverUri: draft.coverImageUri || current.coverUri,
    videoUri: draft.videoSourceUri,
    ingredientsText: draft.ingredients.join('\n'),
    stepsText: draft.preparationSteps.join('\n'),
    unifiedNotes: draft.unifiedChefNotesAndNutrition,
    tagsText: draft.tags.join(', '),
    isImportOpen: false,
    isFetchingYoutube: false,
    validationError: null,
  };
}

function mergeParsedRecipeIntoForm(
  current: RecipeFormStateValues,
  parsed: ParsedRecipeTextResult,
): RecipeFormStateValues {
  return {
    ...current,
    title: parsed.extractedTitle,
    ingredientsText:
      parsed.extractedIngredients.length > 0
        ? parsed.extractedIngredients.join('\n')
        : current.ingredientsText,
    stepsText:
      parsed.extractedSteps.length > 0 ? parsed.extractedSteps.join('\n') : current.stepsText,
    prepMinutes: String(parsed.extractedMinutes),
    servings: String(parsed.extractedServings),
    unifiedNotes: parsed.extractedNotesAndNutrition || current.unifiedNotes,
    isImportOpen: false,
    validationError: null,
  };
}

async function executeFormSubmit(
  values: RecipeFormStateValues,
  onSave: (draft: RecipeDraftInput) => Promise<void>,
  updateField: <K extends keyof RecipeFormStateValues>(
    field: K,
    value: RecipeFormStateValues[K],
  ) => void,
): Promise<void> {
  try {
    const draft = buildDraftFromFormValues(values);
    await onSave(draft);
  } catch (err) {
    updateField('validationError', err instanceof Error ? err.message : 'Erro ao salvar receita');
  }
}

/**
 * Converte o estado textual do formulário no contrato tipado RecipeDraftInput.
 *
 * @example
 * const draft = buildDraftFromFormValues(formValues);
 */
export function buildDraftFromFormValues(values: RecipeFormStateValues): RecipeDraftInput {
  return {
    title: values.title,
    category: values.category,
    difficulty: values.difficulty,
    preparationMinutes: Math.max(1, parseInt(values.prepMinutes, 10) || 25),
    servingsCount: Math.max(1, parseInt(values.servings, 10) || 4),
    coverImageUri: values.coverUri.trim(),
    videoSourceUri: values.videoUri.trim(),
    ingredients: splitIntoNonEmptyLines(values.ingredientsText),
    preparationSteps: splitIntoNonEmptyLines(values.stepsText),
    unifiedChefNotesAndNutrition: values.unifiedNotes.trim(),
    tags: values.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
  };
}
