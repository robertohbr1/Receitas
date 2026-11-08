import { CulinaryRecipeRecord } from '../types/recipeTypes';

/**
 * Receitas inaugurais pré-cadastradas para demonstrar vídeos, passos com timer e notas unificadas.
 */
export const INITIAL_SEED_RECIPES: readonly CulinaryRecipeRecord[] = [
  {
    id: 'seed-risoto-funghi-01',
    title: 'Risoto Cremoso de Funghi Secchi com Parmesão',
    category: 'Massas',
    coverImageUri:
      'https://images.unsplash.com/photo-1633964913295-ceb43826e7c9?auto=format&fit=crop&w=900&q=80',
    videoSourceUri: 'https://www.youtube.com/watch?v=2Hj2h1rR2vY',
    preparationMinutes: 35,
    servingsCount: 4,
    difficulty: 'Médio',
    ingredients: [
      '300g de arroz arbóreo ou carnaroli',
      '40g de cogumelos funghi secchi hidratados em água morna',
      '1 cebola pequena bem picada',
      '2 dentes de alho picados',
      '100ml de vinho branco seco',
      '1 litro de caldo de legumes quente',
      '2 colheres de sopa de manteiga gelada',
      '80g de queijo parmesão ralado na hora',
    ],
    preparationSteps: [
      'Hidrate o funghi secchi em 250ml de água morna por 15 minutos, escorra e pique grosseiramente (reserve a água coada).',
      'Refogue a cebola e o alho em azeite por 3 minutos até ficarem translúcidos e adicione o funghi picado.',
      'Acrescente o arroz arbóreo, mexa por 2 minutos para selar os grãos e regue com o vinho branco até evaporar.',
      'Adicione a água do funghi e vá colocando o caldo quente concha a concha, mexendo por 16 minutos até ficar al dente.',
      'Desligue o fogo, incorpore a manteiga gelada e o parmesão vigorosamente (mantecatura) e descanse por 2 minutos.',
    ],
    unifiedChefNotesAndNutrition:
      'Dica do Chef: Nunca lave o arroz de risoto para preservar o amido natural. Use manteiga bem gelada no final para brilho aveludado.\nInformações Nutricionais: ~460 kcal por porção | Carboidratos: 58g | Proteínas: 14g | Gorduras: 16g.',
    tags: ['Italiana', 'Jantar Especial', 'Cogumelos'],
    isFavorite: true,
    createdAtIso: '2026-11-01T12:00:00.000Z',
  },
  {
    id: 'seed-bolo-cenoura-02',
    title: 'Bolo Vulcão de Cenoura com Brigadeiro Meio Amargo',
    category: 'Sobremesas',
    coverImageUri:
      'https://images.unsplash.com/photo-1578985545062-69928b1d9587?auto=format&fit=crop&w=900&q=80',
    videoSourceUri: 'https://www.youtube.com/watch?v=L1czfV3u9M8',
    preparationMinutes: 50,
    servingsCount: 10,
    difficulty: 'Fácil',
    ingredients: [
      '3 cenouras médias descascadas e picadas (cerca de 250g)',
      '3 ovos inteiros em temperatura ambiente',
      '2/3 de xícara de óleo de girassol ou milho',
      '1 e 1/2 xícara de açúcar refinado',
      '2 xícaras de farinha de trigo peneirada',
      '1 colher de sopa de fermento químico em pó',
      '1 lata de leite condensado + 1 caixinha de creme de leite + 100g de chocolate 50% cacau',
    ],
    preparationSteps: [
      'Bata no liquidificador as cenouras, os ovos, o óleo e o açúcar por 4 minutos até obter um creme bem liso.',
      'Transfira para uma tigela e envolva a farinha peneirada com um fouet, adicionando o fermento por último.',
      'Despeje em forma de furo central untada e asse em forno pré-aquecido a 180°C por 40 minutos.',
      'Para a calda: leve o leite condensado, creme de leite e chocolate ao fogo baixo mexendo por 8 minutos até engrossar.',
      'Desenforme o bolo morno e despeje o brigadeiro cremoso no centro.',
    ],
    unifiedChefNotesAndNutrition:
      'Segredo para não solar: pese a cenoura (não ultrapasse 260g) e peneire a farinha fora do liquidificador.\nNutrição estimada: 340 kcal por fatia | Carboidratos: 48g | Gorduras: 14g | Proteínas: 5g.',
    tags: ['Confeitaria', 'Café da Tarde', 'Chocolate'],
    isFavorite: true,
    createdAtIso: '2026-11-02T15:30:00.000Z',
  },
  {
    id: 'seed-bowl-salmao-03',
    title: 'Poke Bowl Tropical de Salmão Grelhado e Manga',
    category: 'Saudáveis',
    coverImageUri:
      'https://images.unsplash.com/photo-1546069901-ba9599a7e63c?auto=format&fit=crop&w=900&q=80',
    videoSourceUri: 'https://www.instagram.com/reel/C8exampleReel/',
    preparationMinutes: 20,
    servingsCount: 2,
    difficulty: 'Fácil',
    ingredients: [
      '300g de salmão em cubos',
      '1 xícara de arroz japonês ou integral cozido',
      '1/2 manga palmer em cubos',
      '1/2 pepino japonês fatiado fino',
      '1/2 abacate fatiado com gotas de limão',
      '2 colheres de sopa de shoyu light + 1 colher de chá de óleo de gergelim',
      'Gergelim tostado e cebolinha verde a gosto',
    ],
    preparationSteps: [
      'Tempere os cubos de salmão com o shoyu, óleo de gergelim e gengibre ralado e deixe marinar por 5 minutos.',
      'Doure o salmão em frigideira antiaderente bem quente por 4 minutos até criar crosta dourada mantendo o interior úmido.',
      'Monte a tigela com a base de arroz e disponha o salmão, a manga, o pepino e o abacate em setores.',
      'Finalize com gergelim tostado e cebolinha fresca picada.',
    ],
    unifiedChefNotesAndNutrition:
      'Dica: Também pode ser feito na AirFryer a 200°C por 7 minutos.\nValor Nutricional: 510 kcal por bowl | Rico em Ômega-3 | Proteínas: 34g | Carboidratos: 42g | Gorduras boas: 22g.',
    tags: ['Fit', 'Almoço Rápido', 'Sem Glúten'],
    isFavorite: false,
    createdAtIso: '2026-11-03T18:00:00.000Z',
  },
];
