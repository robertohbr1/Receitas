import { CulinaryCategory, DifficultyLevel } from '../types/recipeTypes';

/**
 * Estrutura de cores semânticas para o Tema Quente & Gastronômico.
 */
export interface GastronomicColorPalette {
  readonly backgroundPrimary: string;
  readonly backgroundCard: string;
  readonly backgroundElevated: string;
  readonly textPrimary: string;
  readonly textSecondary: string;
  readonly accentTerracotta: string;
  readonly accentSoftOrange: string;
  readonly accentWarmGold: string;
  readonly borderSubtle: string;
  readonly badgeBackground: string;
  readonly successOlive: string;
  readonly dangerCrimson: string;
}

export const LIGHT_GASTRONOMIC_PALETTE: GastronomicColorPalette = {
  backgroundPrimary: '#FAF6F0',
  backgroundCard: '#FFFFFF',
  backgroundElevated: '#F3ECE2',
  textPrimary: '#2F241F',
  textSecondary: '#6E5A4F',
  accentTerracotta: '#C85A32',
  accentSoftOrange: '#E07A5F',
  accentWarmGold: '#D99B26',
  borderSubtle: '#E6DCD0',
  badgeBackground: '#F7E7DF',
  successOlive: '#4A7C59',
  dangerCrimson: '#B83B2B',
};

export const DARK_GASTRONOMIC_PALETTE: GastronomicColorPalette = {
  backgroundPrimary: '#1E1612',
  backgroundCard: '#2B201B',
  backgroundElevated: '#382A23',
  textPrimary: '#FAF3EB',
  textSecondary: '#C4B2A5',
  accentTerracotta: '#E07A5F',
  accentSoftOrange: '#F29578',
  accentWarmGold: '#E8B24C',
  borderSubtle: '#46352C',
  badgeBackground: '#3D2920',
  successOlive: '#68A378',
  dangerCrimson: '#E05A47',
};

export const AVAILABLE_CULINARY_CATEGORIES: readonly CulinaryCategory[] = [
  'Todas',
  'Sobremesas',
  'Massas',
  'Carnes',
  'Rápidas',
  'Saudáveis',
  'Lanches',
  'Bebidas',
];

export const AVAILABLE_DIFFICULTY_LEVELS: readonly DifficultyLevel[] = [
  'Fácil',
  'Médio',
  'Difícil',
];

/**
 * Seleciona a paleta gastronômica apropriada conforme o modo escuro ou claro.
 *
 * @example
 * const palette = selectGastronomicPalette(true);
 * // palette.backgroundPrimary === '#1E1612'
 */
export function selectGastronomicPalette(
  isDarkModeEnabled: boolean,
): GastronomicColorPalette {
  if (isDarkModeEnabled) {
    return DARK_GASTRONOMIC_PALETTE;
  }
  return LIGHT_GASTRONOMIC_PALETTE;
}

/**
 * Retorna um emoji representativo para a categoria culinária informada.
 *
 * @example
 * const icon = resolveCategoryIcon('Sobremesas');
 * // icon === '🍰'
 */
export function resolveCategoryIcon(category: CulinaryCategory): string {
  const categoryIconMap: Record<CulinaryCategory, string> = {
    Todas: '🍽️',
    Sobremesas: '🍰',
    Massas: '🍝',
    Carnes: '🥩',
    Rápidas: '⚡',
    Saudáveis: '🥗',
    Lanches: '🥪',
    Bebidas: '🍹',
  };
  return categoryIconMap[category];
}
