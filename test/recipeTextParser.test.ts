import {
  detectSectionHeader,
  extractPreparationMinutesFromText,
  extractServingsFromText,
  looksLikeIngredientLine,
  parseFreeformRecipeText,
  splitIntoNonEmptyLines,
  stripLeadingBulletOrNumber,
} from '../src/services/recipeTextParser';

describe('recipeTextParser', () => {
  it('separa linhas não vazias removendo espaços excedentes', () => {
    const lines = splitIntoNonEmptyLines('  Bolo de Fubá \n\n  2 ovos \r\n ');
    expect(lines).toEqual(['Bolo de Fubá', '2 ovos']);
  });

  it('detecta cabeçalhos de seção de ingredientes, preparo e notas/nutrição', () => {
    expect(detectSectionHeader('Ingredientes:')).toBe('ingredients');
    expect(detectSectionHeader('Modo de Preparo')).toBe('steps');
    expect(detectSectionHeader('Dicas:')).toBe('notes');
    expect(detectSectionHeader('Informação Nutricional:')).toBe('notes');
    expect(detectSectionHeader('Misture tudo muito bem')).toBeNull();
  });

  it('identifica linhas com formato de ingrediente e limpa marcadores iniciais', () => {
    expect(looksLikeIngredientLine('- 200g de creme de leite')).toBe(true);
    expect(looksLikeIngredientLine('2 colheres de sopa de manteiga')).toBe(true);
    expect(stripLeadingBulletOrNumber('1) Peneire a farinha')).toBe('Peneire a farinha');
    expect(stripLeadingBulletOrNumber('• 3 ovos')).toBe('3 ovos');
  });

  it('extrai tempo em minutos e rendimento em porções do texto livre', () => {
    expect(extractPreparationMinutesFromText('Forno por 45 minutos a 180 graus')).toBe(45);
    expect(extractPreparationMinutesFromText('Texto sem tempo')).toBe(30);
    expect(extractServingsFromText('Rende 8 porções generosas')).toBe(8);
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

  it('lança erro descritivo quando o texto para importação está em branco', () => {
    expect(() => parseFreeformRecipeText('   \n  ')).toThrow(/Texto para importação está vazio/);
  });
});
