import {
  isStandaloneSupportedVideoUrl,
  resolveSocialRecipeDraftFromUrl,
} from '../src/adapters/youtubeMetadataGateway';
import {
  buildRecipeDraftFromInstagramMetadata,
  decodeHtmlAttributeEntities,
  extractInstagramMetadataFromHtml,
  extractInstagramVideoStreamUrlFromHtml,
  isInstagramPromoNoiseLine,
  isStandaloneInstagramUrl,
  stripInstagramMetaWrapperPrefix,
  stripInstagramPromotionalLines,
} from '../src/services/instagramCaptionParser';
import { FakeYoutubeVideoMetadataGateway } from './fakes/InMemoryStorageGateway';

describe('instagramCaptionParser', () => {
  const sampleInstagramEmbedHtml = `
    <html>
      <head>
        <meta property="og:image" content="https://scontent.cdninstagram.com/v/capa-bolo.jpg?stp=dst&amp;efg=123" />
        <meta property="og:description" content="12K likes, 340 comments - chef_ana on October 15, 2026: &quot;BOLO DE CENOURA FOFINHO&quot;" />
      </head>
      <body>
        <div class="Caption">
          <a class="CaptionUsername" href="https://www.instagram.com/chef_ana/">chef_ana</a>
          BOLO DE CENOURA DE LIQUIDIFICADOR<br /><br />
          Comente EU QUERO que mando mais receitas!<br />
          Siga @chef_ana para dicas diárias<br />
          INGREDIENTES:<br />
          - 3 cenouras médias picadas<br />
          - 3 ovos<br />
          - 2 xícaras de farinha de trigo<br />
          - 1 colher de sopa de fermento<br />
          MODO DE PREPARO:<br />
          1. Bata as cenouras e os ovos no liquidificador por 5 minutos.<br />
          2. Misture a farinha e asse a 180°C por 35 minutos. Rende 10 porções.<br />
          #bolodecenoura #confeitaria #receitafacil
          <div class="CaptionComments">Ver todos os comentários</div>
        </div>
      </body>
    </html>
  `;

  it('decodifica entidades HTML e remove o prefixo de curtidas das metatags do Instagram', () => {
    expect(decodeHtmlAttributeEntities('P&atilde;o&#x20;de&#32;Queijo &amp; Caf&eacute;')).toContain(
      '&',
    );
    const rawMeta =
      '15K likes, 120 comments - confeitaria_real on May 10, 2026: "BRIGADEIRO GOURMET\n1 lata de leite condensado"';
    expect(stripInstagramMetaWrapperPrefix(rawMeta)).toBe(
      'BRIGADEIRO GOURMET\n1 lata de leite condensado',
    );
  });

  it('filtra chamadas de engajamento e hashtags típicas de legendas do Instagram', () => {
    expect(isInstagramPromoNoiseLine('Comente EU QUERO para receber no direct!')).toBe(true);
    expect(isInstagramPromoNoiseLine('Link na bio com desconto')).toBe(true);
    expect(isInstagramPromoNoiseLine('Siga @receitas_da_vovo')).toBe(true);
    expect(isInstagramPromoNoiseLine('200g de creme de leite')).toBe(false);

    const cleaned = stripInstagramPromotionalLines(
      ' Pudim Rápido #pudim \nComente EU QUERO\n1 lata de leite condensado #doce',
    );
    expect(cleaned).toBe('Pudim Rápido\n1 lata de leite condensado');
  });

  it('extrai legenda, autor, capa e constrói RecipeDraftInput completo de um Reel do Instagram', () => {
    const metadata = extractInstagramMetadataFromHtml('C8abc123', sampleInstagramEmbedHtml);
    expect(metadata.authorUsername).toBe('chef_ana');
    expect(metadata.thumbnailUrl).toBe(
      'https://scontent.cdninstagram.com/v/capa-bolo.jpg?stp=dst&efg=123',
    );

    const draft = buildRecipeDraftFromInstagramMetadata(metadata);
    expect(draft.title).toBe('BOLO DE CENOURA DE LIQUIDIFICADOR');
    expect(draft.category).toBe('Sobremesas');
    expect(draft.videoSourceUri).toBe('https://www.instagram.com/reel/C8abc123/');
    expect(draft.ingredients).toEqual([
      '3 cenouras médias picadas',
      '3 ovos',
      '2 xícaras de farinha de trigo',
      '1 colher de sopa de fermento',
    ]);
    expect(draft.preparationSteps.length).toBe(2);
    expect(draft.servingsCount).toBe(10);
    expect(draft.unifiedChefNotesAndNutrition).toContain('Instagram: @chef_ana');
    expect(draft.tags).toContain('Instagram');
  });

  it('reconhece links isolados tanto do Instagram quanto do YouTube', async () => {
    expect(isStandaloneInstagramUrl('https://www.instagram.com/reel/C8abc123/?igsh=123')).toBe(
      true,
    );
    expect(isStandaloneInstagramUrl('Veja https://www.instagram.com/reel/C8abc123/')).toBe(false);
    expect(isStandaloneSupportedVideoUrl('https://www.instagram.com/p/D12345/')).toBe(true);
    expect(isStandaloneSupportedVideoUrl('https://www.youtube.com/shorts/eydMbeMvEe8')).toBe(
      true,
    );

    const fakeYt = new FakeYoutubeVideoMetadataGateway({
      videoId: 'eydMbeMvEe8',
      canonicalWatchUrl: 'https://www.youtube.com/watch?v=eydMbeMvEe8',
      title: 'Pão de Queijo',
      descriptionText: '500g de polvilho\n1. Asse por 20 minutos',
      thumbnailUrl: 'https://img.youtube.com/vi/eydMbeMvEe8/hqdefault.jpg',
      channelName: 'Canal Teste',
    });
    const resolvedDraft = await resolveSocialRecipeDraftFromUrl(
      'https://youtu.be/eydMbeMvEe8',
      fakeYt,
    );
    expect(resolvedDraft.title).toBe('Pão de Queijo');
  });

  it('regressão: extrai título, ingredientes e cobertura do post DfX1iTFAX0m (Picolé na caixinha de leite)', () => {
    const dfX1iTFAX0mHtml = `
      <html>
        <head>
          <meta property="og:image" content="https://scontent.cdninstagram.com/v/t51.82787-15/887790281_n.jpg?stp=cmp1&amp;ccb=7-5" />
          <meta property="og:description" content="533K likes, 1,279 comments - receitaemcasaoficial no November 5, 2026: &quot;Picol&#xe9; na caixinha de leite &#x1f353;

Esse &#xe9; um dos meus melhores achados para casa no &#064;mercadolivre e ainda tem a entrega mais r&#xe1;pido do Brasil &#x1f525;&#x1f49b;

TIJELA
id: 41TN74-PZAX

Ingredientes:
2 Caixinhas de creme de leite
1 Caixinha de leite condensado
1 Pacote de suco em p&#xf3; de morango

Cobertura:
Derrete 250g de chocolate fracionado meio amargo com 2
colheres de sopa de &#xf3;leo de coco no microondas de 30 em 30
segundos

#DecorNoMeli #Publi #AeC569 #MercadoLivre&quot;. " />
        </head>
      </html>
    `;

    const meta = extractInstagramMetadataFromHtml('DfX1iTFAX0m', dfX1iTFAX0mHtml);
    expect(meta.authorUsername).toBe('receitaemcasaoficial');
    const draft = buildRecipeDraftFromInstagramMetadata(meta);
    expect(draft.title).toBe('Picolé na caixinha de leite 🍓');
    expect(draft.category).toBe('Sobremesas');
    expect(draft.ingredients).toEqual([
      '2 Caixinhas de creme de leite',
      '1 Caixinha de leite condensado',
      '1 Pacote de suco em pó de morango',
    ]);
    expect(draft.preparationSteps).toEqual([
      'Derrete 250g de chocolate fracionado meio amargo com 2 colheres de sopa de óleo de coco no microondas de 30 em 30 segundos',
    ]);
    expect(draft.unifiedChefNotesAndNutrition).toContain('📝 Texto Completo da Publicação:');
  });

  it('extrai stream de vídeo MP4 do Instagram e usa transcrição de áudio (Gemini/Whisper) nos dados', () => {
    const htmlWithVideo = `
      <meta property="og:video" content="https://scontent.cdninstagram.com/v/reel-audio.mp4?efg=1&amp;test=2" />
    `;
    expect(extractInstagramVideoStreamUrlFromHtml(htmlWithVideo)).toBe(
      'https://scontent.cdninstagram.com/v/reel-audio.mp4?efg=1&test=2',
    );

    const draftWithTranscript = buildRecipeDraftFromInstagramMetadata({
      shortcode: 'ReelAudio1',
      canonicalPostUrl: 'https://www.instagram.com/reel/ReelAudio1/',
      authorUsername: 'chef_audio',
      captionText: 'Bolo de Caneca Fácil',
      thumbnailUrl: 'https://scontent.cdninstagram.com/v/thumb.jpg',
      videoStreamUrl: 'https://scontent.cdninstagram.com/v/reel-audio.mp4',
      transcriptText:
        'coloque 1 ovo e 2 colheres de chocolate em pó na caneca agora você vai levar ao microondas por 3 minutos',
    });

    expect(draftWithTranscript.preparationMinutes).toBe(3);
    expect(draftWithTranscript.ingredients).toEqual(['1 ovo', '2 colheres de chocolate em pó']);
    expect(draftWithTranscript.preparationSteps.length).toBeGreaterThanOrEqual(2);
    expect(draftWithTranscript.unifiedChefNotesAndNutrition).toContain(
      '🎙️ Transcrição Completa do Vídeo:',
    );
    expect(draftWithTranscript.unifiedChefNotesAndNutrition).toContain(
      '📝 Texto Completo da Publicação:',
    );
  });
});
