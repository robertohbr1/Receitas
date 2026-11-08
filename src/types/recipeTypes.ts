/**
 * Categorias gastronômicas disponíveis para classificar receitas no catálogo.
 */
export type CulinaryCategory =
  | 'Todas'
  | 'Sobremesas'
  | 'Massas'
  | 'Carnes'
  | 'Rápidas'
  | 'Saudáveis'
  | 'Lanches'
  | 'Bebidas';

/**
 * Níveis de complexidade de execução de uma receita culinária.
 */
export type DifficultyLevel = 'Fácil' | 'Médio' | 'Difícil';

/**
 * Origem classificada do vídeo associado à receita.
 */
export type VideoProviderKind =
  | 'youtube'
  | 'instagram'
  | 'tiktok'
  | 'gallery_file'
  | 'external_url'
  | 'none';

/**
 * Metadados estruturados sobre o vídeo de demonstração da receita.
 */
export interface RecipeVideoDescriptor {
  readonly rawUri: string;
  readonly providerKind: VideoProviderKind;
  readonly embedUri: string | null;
  readonly thumbnailUri: string | null;
}

/**
 * Entidade principal de uma receita culinária armazenada localmente.
 */
export interface CulinaryRecipeRecord {
  readonly id: string;
  readonly title: string;
  readonly category: Exclude<CulinaryCategory, 'Todas'>;
  readonly coverImageUri: string;
  readonly videoSourceUri: string;
  readonly preparationMinutes: number;
  readonly servingsCount: number;
  readonly difficulty: DifficultyLevel;
  readonly ingredients: readonly string[];
  readonly preparationSteps: readonly string[];
  /**
   * Campo único consolidado para dicas do chef, notas pessoais, variações
   * e informações nutricionais / calorias.
   */
  readonly unifiedChefNotesAndNutrition: string;
  readonly tags: readonly string[];
  readonly isFavorite: boolean;
  readonly createdAtIso: string;
}

/**
 * Dados de entrada para criação ou atualização de uma receita no repositório.
 */
export interface RecipeDraftInput {
  readonly title: string;
  readonly category: Exclude<CulinaryCategory, 'Todas'>;
  readonly coverImageUri: string;
  readonly videoSourceUri: string;
  readonly preparationMinutes: number;
  readonly servingsCount: number;
  readonly difficulty: DifficultyLevel;
  readonly ingredients: readonly string[];
  readonly preparationSteps: readonly string[];
  readonly unifiedChefNotesAndNutrition: string;
  readonly tags: readonly string[];
}

/**
 * Critérios de filtragem para pesquisa no catálogo de receitas.
 */
export interface CatalogFilterCriteria {
  readonly searchQuery: string;
  readonly selectedCategory: CulinaryCategory;
  readonly onlyFavorites: boolean;
}

/**
 * Resultado da importação inteligente de texto colado pelo usuário.
 */
export interface ParsedRecipeTextResult {
  readonly extractedTitle: string;
  readonly extractedIngredients: readonly string[];
  readonly extractedSteps: readonly string[];
  readonly extractedMinutes: number;
  readonly extractedServings: number;
  readonly extractedNotesAndNutrition: string;
}
