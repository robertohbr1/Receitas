import {
  countRecipeListItems,
  formatRecipeGroupHeading,
  groupRecipeListIntoBlocks,
  isRecipeGroupHeading,
  readRecipeGroupHeadingTitle,
  sanitizeRecipeGroupHeadings,
} from '../src/services/recipeGroupHeadings';
import {
  analyzeSectionHeaderLine,
  hasLeadingListMarker,
  looksLikeNutritionOrNoteLine,
  looksLikeShortIngredientName,
  looksLikeYieldOrTimeMetadataLine,
} from '../src/services/recipeLineClassifier';
import {
  mergeWrappedIngredientLines,
  mergeWrappedStepLines,
  splitLongStepParagraphs,
  splitParagraphIntoSentences,
} from '../src/services/recipeLineMerging';
import {
  detectSectionHeader,
  extractPreparationMinutesFromText,
  extractServingsFromText,
  looksLikeCookingInstructionSentence,
  looksLikeIngredientLine,
  parseFreeformRecipeText,
  separateRecipeSections,
  splitIntoNonEmptyLines,
  stripLeadingBulletOrNumber,
} from '../src/services/recipeTextParser';

describe('recipeTextParser & separação de Ingredientes e Modo de Preparo', () => {
  it('separa linhas não vazias removendo espaços excedentes', () => {
    const lines = splitIntoNonEmptyLines('  Bolo de Fubá \n\n  2 ovos \r\n ');
    expect(lines).toEqual(['Bolo de Fubá', '2 ovos']);
  });

  it('detecta cabeçalhos de seção de ingredientes, preparo, subgrupos e notas/nutrição', () => {
    expect(detectSectionHeader('Ingredientes:')).toBe('ingredients');
    expect(detectSectionHeader('Ingredientes da Massa:')).toBe('ingredients');
    expect(detectSectionHeader('Massa:')).toBe('ingredients');
    expect(detectSectionHeader('Modo de Preparo')).toBe('steps');
    expect(detectSectionHeader('Como fazer a calda:')).toBe('steps');
    expect(detectSectionHeader('Dicas:')).toBe('notes');
    expect(detectSectionHeader('Informação Nutricional:')).toBe('notes');
    expect(detectSectionHeader('Misture tudo muito bem')).toBeNull();

    const headerMatch = analyzeSectionHeaderLine('Ingredientes da cobertura: 1 lata de leite condensado');
    expect(headerMatch).toEqual({
      section: 'ingredients',
      groupTitle: 'Cobertura:',
      inlineContent: '1 lata de leite condensado',
    });
  });

  it('identifica linhas de ingrediente, verbos de preparo e limpa marcadores/emojis iniciais', () => {
    expect(looksLikeIngredientLine('- 200g de creme de leite')).toBe(true);
    expect(looksLikeIngredientLine('2 colheres de sopa de manteiga')).toBe(true);
    expect(looksLikeIngredientLine('Uma pitada de sal')).toBe(true);
    expect(looksLikeIngredientLine('Manteiga e farinha para untar')).toBe(true);
    expect(looksLikeShortIngredientName('Cheiro-verde picado')).toBe(true);
    expect(looksLikeCookingInstructionSentence('Em uma tigela, misture os ovos')).toBe(true);
    expect(looksLikeCookingInstructionSentence('Hoje vou te ensinar uma receita rápida')).toBe(false);
    expect(looksLikeNutritionOrNoteLine('Obs: pode congelar por 30 dias')).toBe(true);
    expect(looksLikeYieldOrTimeMetadataLine('Rendimento: 8 porções')).toBe(true);
    expect(stripLeadingBulletOrNumber('1) Peneire a farinha')).toBe('Peneire a farinha');
    expect(stripLeadingBulletOrNumber('• 3 ovos')).toBe('3 ovos');
    expect(stripLeadingBulletOrNumber('Passo 2: Asse por 30 minutos')).toBe('Asse por 30 minutos');
    expect(hasLeadingListMarker('1. Bata tudo')).toBe(true);
    expect(hasLeadingListMarker('2 ovos')).toBe(false);
  });

  it('extrai tempo total (incluindo horas ou soma dos passos) e rendimento sem confundir com ingredientes', () => {
    expect(extractPreparationMinutesFromText('Forno por 45 minutos a 180 graus')).toBe(45);
    expect(extractPreparationMinutesFromText('Tempo de preparo: 1h30')).toBe(90);
    expect(extractPreparationMinutesFromText('Refogue por 10 minutos e asse por 25 minutos')).toBe(35);
    expect(extractPreparationMinutesFromText('Texto sem tempo')).toBe(30);
    expect(extractServingsFromText('Rende 8 porções generosas')).toBe(8);
    expect(extractServingsFromText('3 unidades de ovos\nServe 6 pessoas')).toBe(6);
    expect(extractServingsFromText('Sem menção de rendimento')).toBe(4);
  });

  it('importa texto colado completo separando título, ingredientes, passos e nutrição', () => {
    const pastedCaption = [
      'Cookies de Chocolate Belga',
      'Ingredientes:',
      '- 200g de chocolate meio amargo',
      '- 2 colheres de manteiga',
      'Modo de Preparo:',
      '1. Derreta o chocolate com a manteiga por 3 minutos.',
      '2. Asse por 15 minutos. Rende 6 porções.',
      'Dicas:',
      '320 kcal por unidade.',
    ].join('\n');

    const result = parseFreeformRecipeText(pastedCaption);
    expect(result.extractedTitle).toBe('Cookies de Chocolate Belga');
    expect(result.extractedIngredients).toEqual([
      '200g de chocolate meio amargo',
      '2 colheres de manteiga',
    ]);
    expect(result.extractedSteps).toHaveLength(2);
    expect(result.extractedServings).toBe(6);
    expect(result.extractedNotesAndNutrition).toContain('320 kcal');
  });

  it('separa receitas estruturadas por componentes (Massa e Cobertura) preservando os subgrupos em Ingredientes e Preparo', () => {
    const multiPartText = [
      'Bolo Caseiro de Cenoura com Brigadeiro',
      'Massa:',
      '- 3 cenouras médias picadas',
      '- 3 ovos',
      '- 2 xícaras de farinha de trigo',
      'Bata as cenouras e os ovos no liquidificador por 4 minutos.',
      'Misture a farinha e asse por 40 minutos.',
      'Cobertura:',
      '- 1 lata de leite condensado',
      '- 2 colheres de sopa de cacau em pó',
      'Leve ao fogo baixo mexendo por 8 minutos até engrossar.',
    ].join('\n');

    const parsed = parseFreeformRecipeText(multiPartText);
    expect(parsed.extractedIngredients).toEqual([
      'Massa:',
      '3 cenouras médias picadas',
      '3 ovos',
      '2 xícaras de farinha de trigo',
      'Cobertura:',
      '1 lata de leite condensado',
      '2 colheres de sopa de cacau em pó',
    ]);
    expect(parsed.extractedSteps).toEqual([
      'Massa:',
      'Bata as cenouras e os ovos no liquidificador por 4 minutos.',
      'Misture a farinha e asse por 40 minutos.',
      'Cobertura:',
      'Leve ao fogo baixo mexendo por 8 minutos até engrossar.',
    ]);
    expect(parsed.extractedMinutes).toBe(52);
  });

  it('separa ingredientes e modo de preparo mesmo sem cabeçalhos explícitos e expande bullets na mesma linha', () => {
    const unheaded = [
      '• 2 ovos • 1 banana amassada • 2 colheres de sopa de aveia',
      '1 pitada de canela',
      'Misture todos os ingredientes em uma tigela até incorporar.',
      'Doure em frigideira antiaderente por 3 minutos de cada lado.',
    ];
    const separated = separateRecipeSections(unheaded);
    expect(separated.ingredients).toEqual([
      '2 ovos',
      '1 banana amassada',
      '2 colheres de sopa de aveia',
      '1 pitada de canela',
    ]);
    expect(separated.steps).toEqual([
      'Misture todos os ingredientes em uma tigela até incorporar.',
      'Doure em frigideira antiaderente por 3 minutos de cada lado.',
    ]);
  });

  it('mescla continuações quebradas e divide parágrafos longos de preparo em passos individuais', () => {
    const wrappedIngs = mergeWrappedIngredientLines([
      { text: '2 colheres de sopa de', hasListMarker: true },
      { text: 'azeite extravirgem', hasListMarker: false },
      { text: 'sal a gosto', hasListMarker: false },
    ]);
    expect(wrappedIngs.map((e) => e.text)).toEqual([
      '2 colheres de sopa de azeite extravirgem',
      'sal a gosto',
    ]);

    const wrappedSteps = mergeWrappedStepLines([
      { text: 'Derreta o chocolate com 2', hasListMarker: false },
      { text: 'colheres de óleo de coco', hasListMarker: false },
    ]);
    expect(wrappedSteps.map((e) => e.text)).toEqual([
      'Derreta o chocolate com 2 colheres de óleo de coco',
    ]);

    const paragraph =
      'Bata os ovos com o açúcar na batedeira por 5 minutos até dobrar de volume. Incorpore a farinha peneirada delicadamente com um fouet. Despeje na forma untada e asse a 180°C por 35 minutos.';
    expect(splitParagraphIntoSentences(paragraph)).toHaveLength(3);
    expect(splitLongStepParagraphs([{ text: paragraph, hasListMarker: false }])).toHaveLength(3);
  });

  it('agrupa itens por subtítulos em dois-pontos, colchetes e parênteses repetidos', () => {
    expect(isRecipeGroupHeading('Massa:')).toBe(true);
    expect(isRecipeGroupHeading('200g de queijo:')).toBe(false);
    expect(formatRecipeGroupHeading('MOLHO ESPECIAL')).toBe('Molho especial:');
    expect(readRecipeGroupHeadingTitle('Calda:')).toBe('Calda');
    expect(
      sanitizeRecipeGroupHeadings(['Cobertura:', 'Derreta o chocolate']),
    ).toEqual(['Derreta o chocolate']);

    const listWithHeadings = ['Massa:', '2 ovos', 'Calda:', '1 xícara de açúcar'];
    expect(countRecipeListItems(listWithHeadings)).toBe(2);
    const blocks = groupRecipeListIntoBlocks(listWithHeadings);
    expect(blocks).toHaveLength(2);
    expect(blocks[0].heading).toBe('Massa');
    expect(blocks[1].heading).toBe('Calda');
    expect(blocks[1].items[0].displayNumber).toBe(2);
    expect(blocks[1].items[0].sourceIndex).toBe(3);
  });

  it('regressão: passo iniciado por "Serve com..." não vira nota e "porção + kcal" não vira rendimento', () => {
    const parsed = parseFreeformRecipeText(
      [
        'Frango Assado',
        'Ingredientes:',
        '2 peitos de frango',
        'Modo de preparo:',
        'Tempere o frango.',
        'Serve com arroz e feijão',
      ].join('\n'),
    );
    expect(parsed.extractedSteps).toEqual(['Tempere o frango.', 'Serve com arroz e feijão']);
    expect(parsed.extractedNotesAndNutrition).toBe('');
    expect(extractServingsFromText('Cada porção 250 kcal')).toBe(4);
    expect(looksLikeYieldOrTimeMetadataLine('Serve: 6 pessoas')).toBe(true);
    expect(looksLikeYieldOrTimeMetadataLine('Serve com arroz')).toBe(false);
  });

  it('lança erro descritivo quando o texto para importação está em branco', () => {
    expect(() => parseFreeformRecipeText('   \n  ')).toThrow(/Texto para importação está vazio/);
  });
});
