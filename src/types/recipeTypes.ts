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
  readonly originalSourceUrl?: string;
  readonly offlineVideoStreamUrl?: string;
  readonly archivedAtIso?: string;
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
  /**
   * Transcrição integral do que é dito e exibido no vídeo, preservada offline
   * mesmo que o vídeo original saia do ar.
   */
  readonly videoTranscriptText?: string;
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
  readonly originalSourceUrl?: string;
  readonly offlineVideoStreamUrl?: string;
  readonly archivedAtIso?: string;
  readonly preparationMinutes: number;
  readonly servingsCount: number;
  readonly difficulty: DifficultyLevel;
  readonly ingredients: readonly string[];
  readonly preparationSteps: readonly string[];
  readonly unifiedChefNotesAndNutrition: string;
  readonly videoTranscriptText?: string;
  readonly tags: readonly string[];
}

/**
 * Link salvo na fila offline quando uma importação falha por falta de internet ou bloqueio.
 */
export interface PendingRecipeImportItem {
  readonly id: string;
  readonly sourceUrl: string;
  readonly lastErrorMessage: string;
  readonly addedAtIso: string;
}

/**
 * Estrutura JSON retornada pela IA multimodal (áudio + texto visível na tela).
 */
export interface AiExtractedRecipePayload {
  readonly title: string;
  readonly preparationMinutes: number | null;
  readonly servingsCount: number | null;
  readonly ingredients: readonly string[];
  readonly preparationSteps: readonly string[];
  readonly notesAndTranscript: string;
}

/**
 * Modos de ordenação disponíveis no catálogo de receitas.
 */
export type CatalogSortOrder = 'recent' | 'fastest' | 'fewest_ingredients';

/**
 * Critérios de filtragem para pesquisa no catálogo de receitas.
 */
export interface CatalogFilterCriteria {
  readonly searchQuery: string;
  readonly selectedCategory: CulinaryCategory;
  readonly onlyFavorites: boolean;
  readonly maxPrepMinutes?: number | null;
  readonly maxIngredientsCount?: number | null;
  readonly sortBy?: CatalogSortOrder;
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
