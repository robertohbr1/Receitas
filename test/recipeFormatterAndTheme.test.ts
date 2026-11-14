import {
  buildDraftFromFormValues,
  mergeYoutubeDraftIntoForm,
  organizeFormIngredientsAndSteps,
} from '../src/hooks/useRecipeFormController';
import { INITIAL_SEED_RECIPES } from '../src/repositories/seedRecipesCatalog';
import {
  escapeHtmlEntities,
  formatRecipeAsPrintableHtml,
  formatRecipeAsShareableText,
} from '../src/services/recipeFormatter';
import {
  DARK_GASTRONOMIC_PALETTE,
  LIGHT_GASTRONOMIC_PALETTE,
  resolveCategoryIcon,
  selectGastronomicPalette,
} from '../src/theme/gastronomicTheme';

describe('recipeFormatter & gastronomicTheme', () => {
  const sampleRecipe = INITIAL_SEED_RECIPES[1];

  it('formata a receita em texto amigável para compartilhamento com vídeo e notas', () => {
    const sharedText = formatRecipeAsShareableText(sampleRecipe);
    expect(sharedText).toContain(sampleRecipe.title);
    expect(sharedText).toContain(sampleRecipe.videoSourceUri);
    expect(sharedText).toContain('Notas do Chef & Nutrição');
  });

  it('gera documento HTML válido para impressão em PDF escapando caracteres especiais', () => {
    expect(escapeHtmlEntities('5 < 10 & "Quente" > 0')).toBe(
      '5 &lt; 10 &amp; &quot;Quente&quot; &gt; 0',
    );
    const printableHtml = formatRecipeAsPrintableHtml(sampleRecipe);
    expect(printableHtml.startsWith('<!DOCTYPE html>')).toBe(true);
    expect(printableHtml).toContain(sampleRecipe.title);
  });

  it('seleciona paleta clara ou escura e resolve ícones de categoria', () => {
    expect(selectGastronomicPalette(false)).toEqual(LIGHT_GASTRONOMIC_PALETTE);
    expect(selectGastronomicPalette(true)).toEqual(DARK_GASTRONOMIC_PALETTE);
    expect(resolveCategoryIcon('Sobremesas')).toBe('🍰');
    expect(resolveCategoryIcon('Massas')).toBe('🍝');
  });

  it('converte valores textuais do formulário e aplica rascunho do YouTube nos campos', () => {
    const baseState = {
      title: 'Pão de Queijo Mineiro',
      category: 'Lanches' as const,
      difficulty: 'Fácil' as const,
      prepMinutes: '35',
      servings: '12',
      coverUri: 'https://img.com/pao.jpg',
      videoUri: 'https://youtu.be/2Hj2h1rR2vY',
      ingredientsText: '500g de polvilho\n300g de queijo meia cura',
      stepsText: 'Misture tudo\nAsse por 25 minutos',
      unifiedNotes: '180 kcal por unidade',
      tagsText: 'Mineiro, Café, Sem Glúten',
      isImportOpen: false,
      isFetchingYoutube: false,
      validationError: null,
    };
    const draft = buildDraftFromFormValues(baseState);
    expect(draft.title).toBe('Pão de Queijo Mineiro');

    const merged = mergeYoutubeDraftIntoForm(baseState, {
      ...draft,
      title: 'Pão de Queijo do YouTube',
    });
    expect(merged.title).toBe('Pão de Queijo do YouTube');

    const mixedState = {
      ...baseState,
      ingredientsText: '- 3 ovos\n- 2 xícaras de farinha\nModo de preparo:\n1. Bata tudo por 5 minutos.',
      stepsText: '',
    };
    const organized = organizeFormIngredientsAndSteps(mixedState);
    expect(organized.ingredientsText).toBe('3 ovos\n2 xícaras de farinha');
    expect(organized.stepsText).toBe('Bata tudo por 5 minutos.');

    const autoSeparatedDraft = buildDraftFromFormValues(mixedState);
    expect(autoSeparatedDraft.ingredients).toEqual(['3 ovos', '2 xícaras de farinha']);
    expect(autoSeparatedDraft.preparationSteps).toEqual(['Bata tudo por 5 minutos.']);
  });
});
