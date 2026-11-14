import { useState } from 'react';
import {
  resolveSocialRecipeDraftFromUrl,
  YoutubeVideoMetadataGateway,
} from '../adapters/youtubeMetadataGateway';
import {
  separateRecipeSections,
  splitIntoNonEmptyLines,
  stripLeadingBulletOrNumber,
} from '../services/recipeTextParser';
import {
  extractEmbeddedTranscriptFromNotes,
  hasPlaceholderRecipeContent,
  reconstructRecipeFromTranscript,
} from '../services/recipeTranscriptParser';
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
  readonly videoTranscriptText?: string;
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
  readonly organizeIngredientsAndSteps: () => void;
  readonly fetchAndFillFromYoutubeUrl: (
    youtubeUrl: string,
    youtubeGateway: YoutubeVideoMetadataGateway,
  ) => Promise<RecipeDraftInput | null>;
  readonly submitDraft: (onSave: (draft: RecipeDraftInput) => Promise<void>) => Promise<void>;
}

/**
 * Gerencia os campos editáveis do formulário de receita e a importação/separação automática.
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
    organizeIngredientsAndSteps: () =>
      setValues((prev) => organizeFormIngredientsAndSteps(prev)),
    fetchAndFillFromYoutubeUrl: (url, gateway) =>
      executeYoutubeAutoFill(url, gateway, setValues, updateField),
    submitDraft: (onSave) => executeFormSubmit(values, onSave, updateField),
  };
}

function createInitialFormValues(
  existing: CulinaryRecipeRecord | null,
): RecipeFormStateValues {
  const initialTranscript = existing
    ? extractEmbeddedTranscriptFromNotes(
        existing.unifiedChefNotesAndNutrition,
        existing.videoTranscriptText,
      )
    : '';
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
    videoTranscriptText: initialTranscript,
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
 * Aplica um rascunho extraído de vídeo ou site a todos os campos do estado do formulário.
 *
 * @example
 * const nextState = mergeYoutubeDraftIntoForm(currentValues, youtubeDraft);
 */
export function mergeYoutubeDraftIntoForm(
  current: RecipeFormStateValues,
  draft: RecipeDraftInput,
): RecipeFormStateValues {
  const transcript = extractEmbeddedTranscriptFromNotes(
    draft.unifiedChefNotesAndNutrition,
    draft.videoTranscriptText,
  );
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
    videoTranscriptText: transcript || current.videoTranscriptText,
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

/**
 * Reclassifica e limpa as linhas de Ingredientes e Modo de Preparo do formulário, movendo
 * passos colados no campo de ingredientes (e vice-versa) ou extraindo da transcrição se vazios.
 *
 * @example
 * const organized = organizeFormIngredientsAndSteps(currentValues);
 */
export function organizeFormIngredientsAndSteps(
  current: RecipeFormStateValues,
): RecipeFormStateValues {
  const combinedLines = splitIntoNonEmptyLines(
    `${current.ingredientsText}\n${current.stepsText}`,
  );
  const currentTranscript = (current.videoTranscriptText ?? '').trim();
  if (combinedLines.length === 0 && currentTranscript) {
    const fromTranscript = reconstructRecipeFromTranscript(
      currentTranscript,
      current.title || 'Receita Transcrita',
    );
    return mergeParsedRecipeIntoForm(current, fromTranscript);
  }
  if (combinedLines.length === 0) return current;
  const separated = separateRecipeSections(combinedLines);
  const extraNotes = separated.notes.join('\n');
  const mergedNotes = [current.unifiedNotes.trim(), extraNotes].filter(Boolean).join('\n');
  return {
    ...current,
    ingredientsText:
      separated.ingredients.length > 0 ? separated.ingredients.join('\n') : current.ingredientsText,
    stepsText: separated.steps.length > 0 ? separated.steps.join('\n') : current.stepsText,
    unifiedNotes: mergedNotes,
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
 * Converte o estado textual do formulário no contrato tipado RecipeDraftInput,
 * separando automaticamente ingredientes e passos caso tenham sido colados juntos.
 *
 * @example
 * const draft = buildDraftFromFormValues(formValues);
 */
export function buildDraftFromFormValues(values: RecipeFormStateValues): RecipeDraftInput {
  const resolvedLists = resolveCleanedIngredientsAndSteps(
    values.ingredientsText,
    values.stepsText,
    values.videoTranscriptText,
    values.title,
  );
  const transcript = (values.videoTranscriptText ?? '').trim();
  return {
    title: values.title,
    category: values.category,
    difficulty: values.difficulty,
    preparationMinutes: Math.max(1, parseInt(values.prepMinutes, 10) || 25),
    servingsCount: Math.max(1, parseInt(values.servings, 10) || 4),
    coverImageUri: values.coverUri.trim(),
    videoSourceUri: values.videoUri.trim(),
    ingredients: resolvedLists.ingredients,
    preparationSteps: resolvedLists.steps,
    unifiedChefNotesAndNutrition: values.unifiedNotes.trim(),
    videoTranscriptText: transcript || undefined,
    tags: values.tagsText
      .split(',')
      .map((tag) => tag.trim())
      .filter((tag) => tag.length > 0),
  };
}

function resolveCleanedIngredientsAndSteps(
  ingredientsText: string,
  stepsText: string,
  transcriptText = '',
  fallbackTitle = 'Receita',
): { ingredients: string[]; steps: string[] } {
  const rawIngredients = splitIntoNonEmptyLines(ingredientsText);
  const rawSteps = splitIntoNonEmptyLines(stepsText);
  if (rawSteps.length === 0 && rawIngredients.length > 1) {
    const separated = separateRecipeSections(rawIngredients);
    if (separated.ingredients.length > 0 && separated.steps.length > 0) {
      return { ingredients: separated.ingredients, steps: separated.steps };
    }
  }
  const cleanedIngs = rawIngredients.map(stripLeadingBulletOrNumber).filter(Boolean);
  const cleanedSteps = rawSteps.map(stripLeadingBulletOrNumber).filter(Boolean);
  if (hasPlaceholderRecipeContent(cleanedIngs, cleanedSteps) && transcriptText.trim()) {
    const rebuilt = reconstructRecipeFromTranscript(transcriptText, fallbackTitle);
    return {
      ingredients: cleanedIngs.length > 0 && !hasPlaceholderRecipeContent(cleanedIngs, ['ok'])
        ? cleanedIngs
        : [...rebuilt.extractedIngredients],
      steps: cleanedSteps.length > 0 && !hasPlaceholderRecipeContent(['ok'], cleanedSteps)
        ? cleanedSteps
        : [...rebuilt.extractedSteps],
    };
  }
  return { ingredients: cleanedIngs, steps: cleanedSteps };
}