import {
  buildGeminiMultimodalPrompt,
  formatAiPayloadAsFallbackText,
  parseStructuredAiRecipeResponse,
} from '../src/services/aiStructuredRecipeParser';
import { buildRecipeDraftFromInstagramMetadata } from '../src/services/instagramCaptionParser';
import { buildRecipeDraftFromYoutubeMetadata } from '../src/services/youtubeDescriptionParser';

describe('aiStructuredRecipeParser & enriquecimento multimodal', () => {
  it('constrói prompt multimodal instruindo leitura de áudio, texto na tela (OCR) e saída JSON', () => {
    const prompt = buildGeminiMultimodalPrompt(
      'https://www.instagram.com/reel/C8xyz/',
      'Receita rápida de pão de alho',
    );
    expect(prompt).toContain('OCR');
    expect(prompt).toContain('"ingredients"');
    expect(prompt).toContain('Receita rápida de pão de alho');
  });

  it('interpreta resposta JSON pura ou cercada por crases markdown', () => {
    const fenced = [
      '```json',
      '{',
      '  "title": "Bolo Cremoso de Milho",',
      '  "preparationMinutes": 45,',
      '  "servingsCount": 8,',
      '  "ingredients": ["1 lata de milho verde", "3 ovos"],',
      '  "preparationSteps": ["Bata tudo no liquidificador", "Asse por 40 minutos"],',
      '  "notesAndTranscript": "Texto na tela: forma untada com fubá."',
      '}',
      '```',
    ].join('\n');

    const parsed = parseStructuredAiRecipeResponse(fenced);
    expect(parsed).not.toBeNull();
    expect(parsed?.title).toBe('Bolo Cremoso de Milho');
    expect(parsed?.preparationMinutes).toBe(45);
    expect(parsed?.servingsCount).toBe(8);
    expect(parsed?.ingredients).toEqual(['1 lata de milho verde', '3 ovos']);
    expect(parsed?.preparationSteps).toHaveLength(2);
    expect(formatAiPayloadAsFallbackText(parsed!)).toContain('Bolo Cremoso de Milho');
  });

  it('retorna null quando a resposta da IA é texto comum sem objeto JSON válido', () => {
    expect(parseStructuredAiRecipeResponse('Apenas uma transcrição comum sem JSON')).toBeNull();
  });

  it('usa extração multimodal estruturada no Instagram quando o vídeo é mudo ou sem legenda detalhada', () => {
    const draft = buildRecipeDraftFromInstagramMetadata({
      shortcode: 'OcrReel99',
      canonicalPostUrl: 'https://www.instagram.com/reel/OcrReel99/',
      authorUsername: 'cozinha_pratica',
      captionText: '',
      thumbnailUrl: 'https://scontent.cdninstagram.com/v/ocr-cover.jpg',
      videoStreamUrl: 'https://scontent.cdninstagram.com/v/ocr-video.mp4',
      aiStructuredRecipe: {
        title: 'Cookie de Frigideira',
        preparationMinutes: 12,
        servingsCount: 2,
        ingredients: ['1 colher de sopa de manteiga', '3 colheres de sopa de farinha'],
        preparationSteps: ['Misture na frigideira', 'Asse em fogo baixo por 8 minutos'],
        notesAndTranscript: 'Texto na tela: fogo bem baixo com tampa.',
      },
    });

    expect(draft.title).toBe('Cookie de Frigideira');
    expect(draft.ingredients).toEqual([
      '1 colher de sopa de manteiga',
      '3 colheres de sopa de farinha',
    ]);
    expect(draft.preparationSteps).toEqual([
      'Misture na frigideira',
      'Asse em fogo baixo por 8 minutos',
    ]);
    expect(draft.preparationMinutes).toBe(12);
    expect(draft.servingsCount).toBe(2);
    expect(draft.originalSourceUrl).toBe('https://www.instagram.com/reel/OcrReel99/');
    expect(draft.offlineVideoStreamUrl).toBe('https://scontent.cdninstagram.com/v/ocr-video.mp4');
  });

  it('usa extração estruturada no YouTube quando descrição e legendas não estão disponíveis', () => {
    const draft = buildRecipeDraftFromYoutubeMetadata({
      videoId: 'abc123DEF45',
      canonicalWatchUrl: 'https://www.youtube.com/watch?v=abc123DEF45',
      title: 'Receita do YouTube',
      descriptionText: '',
      thumbnailUrl: 'https://img.youtube.com/vi/abc123DEF45/hqdefault.jpg',
      channelName: 'Chef Teste',
      aiStructuredRecipe: {
        title: 'Caldo Verde Tradicional',
        preparationMinutes: 35,
        servingsCount: 6,
        ingredients: ['500g de batata', '1 maço de couve fatiada'],
        preparationSteps: ['Cozinhe as batatas e bata', 'Adicione a couve no caldo quente'],
        notesAndTranscript: 'Transcrição IA: finalize com fio de azeite.',
      },
    });

    expect(draft.title).toBe('Caldo Verde Tradicional');
    expect(draft.ingredients).toEqual(['500g de batata', '1 maço de couve fatiada']);
    expect(draft.preparationSteps).toHaveLength(2);
    expect(draft.originalSourceUrl).toBe('https://www.youtube.com/watch?v=abc123DEF45');
  });
});
