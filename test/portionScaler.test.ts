import {
  formatScaledNumber,
  parseQuantityToken,
  scaleIngredientLineQuantity,
  scaleIngredientsList,
} from '../src/services/portionScaler';

describe('portionScaler', () => {
  it('interpreta números inteiros, decimais com vírgula, frações simples, mistas e Unicode', () => {
    expect(parseQuantityToken('500')).toBe(500);
    expect(parseQuantityToken('1,5')).toBe(1.5);
    expect(parseQuantityToken('1/2')).toBe(0.5);
    expect(parseQuantityToken('1 e 1/2')).toBe(1.5);
    expect(parseQuantityToken('½')).toBe(0.5);
    expect(parseQuantityToken('abc')).toBeNull();
  });

  it('formata números escalonados com vírgula decimal brasileira quando necessário', () => {
    expect(formatScaledNumber(4)).toBe('4');
    expect(formatScaledNumber(1.5)).toBe('1,5');
  });

  it('recalcula proporcionalmente ingredientes individuais, frações mistas e preserva subtítulos de grupo', () => {
    expect(scaleIngredientLineQuantity('500g de Polvilho azedo', 4, 8)).toBe(
      '1000g de Polvilho azedo',
    );
    expect(scaleIngredientLineQuantity('1 e 1/2 xícara de açúcar refinado', 10, 20)).toBe(
      '3 xícara de açúcar refinado',
    );
    expect(scaleIngredientLineQuantity('3 ovos inteiros', 4, 2)).toBe('1,5 ovos inteiros');
    expect(scaleIngredientLineQuantity('Massa:', 4, 8)).toBe('Massa:');
    expect(scaleIngredientLineQuantity('Sal e pimenta a gosto', 4, 8)).toBe(
      'Sal e pimenta a gosto',
    );

    const list = scaleIngredientsList(['Massa:', '200g de queijo', '2 colheres de manteiga'], 2, 6);
    expect(list).toEqual(['Massa:', '600g de queijo', '6 colheres de manteiga']);
  });

  it('lança erro descritivo se o número de porções for zero ou negativo', () => {
    expect(() => scaleIngredientLineQuantity('2 ovos', 0, 4)).toThrow(
      'Porções inválidas para escalonamento',
    );
  });
});
