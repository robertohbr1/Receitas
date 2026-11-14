import {
  analyzeCookingStepComprehension,
  formatMissingIngredientsShoppingList,
  parseStructuredIngredientLine,
} from '../src/services/recipeComprehensionEnhancer';
import {
  extractEmbeddedTranscriptFromNotes,
  extractSpokenIngredientsFromTranscript,
  hasPlaceholderRecipeContent,
  reconstructRecipeFromTranscript,
} from '../src/services/recipeTranscriptParser';

describe('recipeComprehensionEnhancer', () => {
  it('decompõe ingrediente em quantidade/unidade, nome principal e preparo prévio (Mise en Place)', () => {
    const flour = parseStructuredIngredientLine('2 xícaras de farinha de trigo peneirada');
    expect(flour.quantityAndUnit).toBe('2 xícaras');
    expect(flour.ingredientName).toBe('farinha de trigo');
    expect(flour.preparationHint).toBe('peneirada');

    const onion = parseStructuredIngredientLine('1 cebola roxa picada em cubos');
    expect(onion.quantityAndUnit).toBe('1');
    expect(onion.ingredientName).toBe('cebola roxa');
    expect(onion.preparationHint).toBe('picada em cubos');

    const salt = parseStructuredIngredientLine('Sal e pimenta a gosto');
    expect(salt.quantityAndUnit).toBe('a gosto');
    expect(salt.ingredientName).toBe('Sal e pimenta');
  });

  it('vincula ingredientes escalonados a cada passo e extrai temperatura, verbo e ponto visual', () => {
    const scaledIngredients = [
      '6 ovos inteiros',
      '2 xícaras de açúcar refinado',
      '4 colheres de sopa de manteiga derretida',
      '3 xícaras de farinha de trigo',
    ];
    const stepText =
      'Bata os ovos com o açúcar e a manteiga em fogo baixo até dobrar de volume e asse a 180°C';
    const cues = analyzeCookingStepComprehension(stepText, scaledIngredients);

    expect(cues.matchedIngredients).toEqual([
      '6 ovos inteiros',
      '2 xícaras de açúcar refinado',
      '4 colheres de sopa de manteiga derretida',
    ]);
    expect(cues.actionVerbBadge).toContain('Bater');
    expect(cues.heatOrTemperatureCue).toBe('fogo baixo');
    expect(cues.visualDonenessCue).toBe('até dobrar de volume');
  });

  it('gera lista de compras apenas com os ingredientes ainda não marcados na bancada', () => {
    const list = formatMissingIngredientsShoppingList(
      'Bolo de Fubá',
      ['3 ovos', '2 xícaras de fubá', '1 xícara de leite'],
      new Set([0]),
    );
    expect(list).toContain('• 2 xícaras de fubá');
    expect(list).toContain('• 1 xícara de leite');
    expect(list).not.toContain('3 ovos');
  });
});

describe('recipeTranscriptParser (preservação contra queda de vídeo)', () => {
  it('extrai ingredientes falados com números por extenso e temperos a gosto', () => {
    const transcript =
      'Oi gente! Hoje vamos usar duas colheres de sopa de manteiga, meia xícara de açúcar, 3 ovos inteiros e sal a gosto.';
    const ingredients = extractSpokenIngredientsFromTranscript(transcript);
    expect(ingredients).toEqual(
      expect.arrayContaining([
        'duas colheres de sopa de manteiga',
        'meia xícara de açúcar',
        '3 ovos inteiros',
        'sal a gosto',
      ]),
    );
  });

  it('reconstrói receita completa (ingredientes e passos) a partir da transcrição do vídeo', () => {
    const transcript =
      'Coloque 2 ovos e 1 xícara de leite na tigela. Em seguida misture 2 xícaras de farinha de trigo. Por fim leve ao forno por 25 minutos até dourar.';
    const rebuilt = reconstructRecipeFromTranscript(transcript, 'Bolo Simples');

    expect(rebuilt.extractedTitle).toBe('Bolo Simples');
    expect(rebuilt.extractedIngredients.length).toBeGreaterThanOrEqual(3);
    expect(rebuilt.extractedSteps.length).toBeGreaterThanOrEqual(2);
    expect(rebuilt.extractedMinutes).toBe(25);
  });

  it('detecta placeholders de receita dependente de vídeo e recupera transcrição salva', () => {
    expect(
      hasPlaceholderRecipeContent(
        ['Confira as quantidades demonstradas no vídeo'],
        ['Assista ao passo a passo no vídeo acima.'],
      ),
    ).toBe(true);
    expect(hasPlaceholderRecipeContent(['2 ovos'], ['Bata os ovos por 2 minutos.'])).toBe(false);

    const legacyNotes =
      'Canal: Chef\n\n🎙️ Transcrição Completa do Vídeo:\nMisture tudo muito bem na panela.';
    expect(extractEmbeddedTranscriptFromNotes(legacyNotes)).toBe(
      'Misture tudo muito bem na panela.',
    );
  });
});
