import {
  buildRecipeDraftFromYoutubeMetadata,
  cleanYoutubeVideoTitle,
  extractJsonStringField,
  extractYoutubeMetadataFromWatchHtml,
  extractYoutubeTranscriptFromTimedTextXml,
  inferCategoryFromRecipeText,
  isStandaloneYoutubeUrl,
  isYoutubePromoNoiseLine,
  parseYoutubeMetadataIntoRecipe,
  splitTranscriptIntoCookingSteps,
  stripYoutubePromotionalLines,
} from '../src/services/youtubeDescriptionParser';
import { FakeYoutubeVideoMetadataGateway } from './fakes/InMemoryStorageGateway';

describe('youtubeDescriptionParser', () => {
  const sampleWatchHtml = `var ytInitialPlayerResponse = ${JSON.stringify({
    videoDetails: {
      title: 'PUDIM DE LEITE CONDENSADO SEM FURINHOS | RECEITA FÁCIL - YouTube',
      author: 'Chef em Casa',
      shortDescription: [
        'Aprenda o melhor pudim da sua vida!',
        'Inscreva-se no nosso canal e deixe seu like!',
        'https://instagram.com/chefemcasa',
        'INGREDIENTES:',
        '- 1 lata de leite condensado',
        '- 3 ovos inteiros',
        '- 1 xícara de açúcar para a calda',
        'MODO DE PREPARO:',
        '1. Derreta o açúcar por 5 minutos até caramelizar.',
        '2. Bata os líquidos e asse em banho-maria por 50 minutos. Rende 8 porções.',
        '#pudim #sobremesa',
      ].join('\n'),
    },
  })};`;

  it('extrai campos JSON escapados e metadados completos do HTML do YouTube', () => {
    expect(extractJsonStringField('{"author":"Canal Doce"}', 'author')).toBe('Canal Doce');
    const metadata = extractYoutubeMetadataFromWatchHtml('2Hj2h1rR2vY', sampleWatchHtml);
    expect(metadata.title).toBe('PUDIM DE LEITE CONDENSADO SEM FURINHOS');
    expect(metadata.channelName).toBe('Chef em Casa');
    expect(metadata.thumbnailUrl).toBe('https://img.youtube.com/vi/2Hj2h1rR2vY/hqdefault.jpg');
  });

  it('limpa títulos com hashtags e remove ruídos promocionais de descrições do YouTube', () => {
    expect(
      cleanYoutubeVideoTitle(
        'PÃO DE QUEIJO COM POLVILHO AZEDO- NÃO MURCHA #receitas #dicas #cafe',
      ),
    ).toBe('PÃO DE QUEIJO COM POLVILHO AZEDO- NÃO MURCHA');
    expect(isYoutubePromoNoiseLine('DEIXA SEU LIKE 👍')).toBe(true);
    expect(isYoutubePromoNoiseLine('SE INSCREVA')).toBe(true);
    expect(
      isYoutubePromoNoiseLine('💥LINK DO CURSO 👇👇https://go.hotmart.com/V93926566A?dp=1'),
    ).toBe(true);
    expect(isYoutubePromoNoiseLine('2 xícaras de farinha')).toBe(false);
    const stripped = stripYoutubePromotionalLines('2 ovos\nSE INSCREVA\n#receita');
    expect(stripped).toBe('2 ovos');
  });

  it('infere a categoria gastronômica correta pelo texto e valida URLs isoladas', () => {
    expect(inferCategoryFromRecipeText('Brigadeiro de Colher Cremoso')).toBe('Sobremesas');
    expect(inferCategoryFromRecipeText('Pão de Queijo com Polvilho Azedo')).toBe('Lanches');
    expect(inferCategoryFromRecipeText('Macarrão Espaguete ao Alho')).toBe('Massas');
    expect(inferCategoryFromRecipeText('Salmão Grelhado na Manteiga')).toBe('Carnes');
    expect(isStandaloneYoutubeUrl('https://www.youtube.com/shorts/eydMbeMvEe8')).toBe(true);
    expect(isStandaloneYoutubeUrl('Receita com link https://youtu.be/2Hj2h1rR2vY')).toBe(false);
  });

  it('converte metadados do YouTube em RecipeDraftInput completo com ingredientes e passos', async () => {
    const metadata = extractYoutubeMetadataFromWatchHtml('2Hj2h1rR2vY', sampleWatchHtml);
    const fakeGateway = new FakeYoutubeVideoMetadataGateway(metadata);
    const fetched = await fakeGateway.fetchVideoMetadataByUrl('https://youtu.be/2Hj2h1rR2vY');
    const parsed = parseYoutubeMetadataIntoRecipe(fetched);
    expect(parsed.extractedIngredients).toContain('1 lata de leite condensado');
    expect(parsed.extractedServings).toBe(8);

    const draft = buildRecipeDraftFromYoutubeMetadata(fetched);
    expect(draft.category).toBe('Sobremesas');
    expect(draft.coverImageUri).toContain('2Hj2h1rR2vY');
    expect(draft.preparationSteps.length).toBeGreaterThanOrEqual(2);
  });

  it('regressão: extrai todos os 7 ingredientes do Short eydMbeMvEe8 sem linhas promocionais', () => {
    const shortEydHtml = `var ytInitialPlayerResponse = ${JSON.stringify({
      videoDetails: {
        title:
          'PÃO DE QUEIJO COM POLVILHO AZEDO- NÃO MURCHA #receitas #dicas #cafedatarde #cafe #receita',
        author: 'Ediane - Comida Mineira',
        shortDescription: [
          'PÃO DE QUEIJO COM POLVILHO AZEDO- NÃO MURCHA  FÁCIL e RÁPIDO ',
          '💥LINK  DO CURSO COMPLETO de PÃO de QUEIJO CONGELADO 👇👇https://go.hotmart.com/V93926566A?dp=1',
          'DEIXA SEU LIKE 👍 ',
          'SE INSCREVA ',
          'INGREDIENTES ',
          '500g de Polvilho azedo ',
          '1 colher rasa de sal ',
          '150ml de óleo ',
          '150ml água ',
          '150ml de água ',
          '3 ovos ',
          '300g de queijo ralado ',
          'DEUS ABENÇOE a TODOS',
          'RECEITA FÁCIL DE PÃO DE QUEIJO MINEIRO',
        ].join('\n'),
      },
    })};`;

    const meta = extractYoutubeMetadataFromWatchHtml('eydMbeMvEe8', shortEydHtml);
    const draft = buildRecipeDraftFromYoutubeMetadata(meta);
    expect(draft.title).toBe('PÃO DE QUEIJO COM POLVILHO AZEDO- NÃO MURCHA');
    expect(draft.category).toBe('Lanches');
    expect(draft.ingredients).toEqual([
      '500g de Polvilho azedo',
      '1 colher rasa de sal',
      '150ml de óleo',
      '150ml água',
      '150ml de água',
      '3 ovos',
      '300g de queijo ralado',
    ]);
  });

  it('transcreve XML timedtext do YouTube, gera passos de preparo falados e grava texto completo nos dados', () => {
    const timedTextXml = [
      '<transcript>',
      '<text start="0.08" dur="3.64">aqui na bacia você vai colocar 500 g de polvilho azedo e misturar bem</text>',
      '<text start="3.72" dur="4.20">agora você vai ferver a água e o óleo para escaldar o polvilho</text>',
      '<text start="7.92" dur="5.10">depois de frio adicione 3 ovos e 300 g de queijo ralado</text>',
      '<text start="13.02" dur="4.50">agora é mão na massa e assar em forno a 180º por 40 minutos</text>',
      '</transcript>',
    ].join('');

    const transcript = extractYoutubeTranscriptFromTimedTextXml(timedTextXml);
    expect(transcript).toContain('500 g de polvilho azedo');
    expect(transcript).toContain('40 minutos');

    const spokenSteps = splitTranscriptIntoCookingSteps(transcript);
    expect(spokenSteps.length).toBe(4);
    expect(spokenSteps[0]).toMatch(/^Aqui na bacia/);
    expect(spokenSteps[3]).toContain('40 minutos.');

    const watchHtmlWithTranscript = `var ytInitialPlayerResponse = ${JSON.stringify({
      videoDetails: {
        title: 'PÃO DE QUEIJO COM POLVILHO AZEDO',
        author: 'Ediane - Comida Mineira',
        shortDescription: 'INGREDIENTES\n500g de Polvilho azedo\n3 ovos',
      },
    })};\n${timedTextXml}`;

    const meta = extractYoutubeMetadataFromWatchHtml('eydMbeMvEe8', watchHtmlWithTranscript);
    expect(meta.transcriptText).toBe(transcript);

    const draft = buildRecipeDraftFromYoutubeMetadata(meta);
    expect(draft.preparationSteps.length).toBe(4);
    expect(draft.preparationMinutes).toBe(40);
    expect(draft.unifiedChefNotesAndNutrition).toContain('🎙️ Transcrição Completa do Vídeo:');
    expect(draft.unifiedChefNotesAndNutrition).toContain(transcript);
  });
});
