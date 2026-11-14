import { isStandaloneSupportedVideoUrl } from '../src/adapters/youtubeMetadataGateway';
import { scaleIngredientLineQuantity } from '../src/services/portionScaler';
import {
  buildRecipeDraftFromWebsiteMetadata,
  extractRecipeWebsiteMetadataFromHtml,
  isStandaloneRecipeWebsiteUrl,
} from '../src/services/recipeWebsiteParser';

describe('recipeWebsiteParser (Receitas Globo)', () => {
  const talithaUrl =
    'https://receitas.globo.com/receitas-da-tv/e-de-casa/alcatra-em-tiras-com-molho-de-queijo-e-batatas-assadas-da-talitha-morete.ghtml';

  const talithaGloboHtml = `
    <html>
      <head>
        <meta property="og:title" content="Alcatra em tiras com molho de queijo: receita da Talitha Morete | Receitas" />
        <meta property="og:image" content="https://s2-receitas.glbimg.com/NBgAZoZ89Wvt1NqwklBKmEwQUqU=/1280x0/filters:format(jpeg)/https://i.s3.glbimg.com/v1/AUTH_1f540e0b94d8437dbbc39d567a1dee68/internal_photos/bs/2026/Q/u/ZyrtnzSvOPTAatRBsX6w/alcatra-em-tiras-receita-edecasa.jpg" />
      </head>
      <body>
        <h1 class="content-head__title" itemprop="headline">Alcatra em tiras com molho de queijo e batatas assadas da Talitha Morete</h1>
        <meta itemprop="recipeCategory" content="Carnes" />
        <div itemscope itemtype="http://schema.org/VideoObject" itemprop="video">
          <meta itemprop="thumbnailUrl" content="https://s03.video.glbimg.com/x720/15168194.jpg" />
          <meta itemprop="contentUrl" content="https://globoplay.globo.com/v/15168194/" />
        </div>
        <div class="recipe-description-labels__signature__content">
          <div class="recipe-description-labels__signature__content__title">
            <a href="https://receitas.globo.com/receitas-da-tv/e-de-casa/">É de Casa</a>
          </div>
          <div class="recipe-description-labels__signature__content__description">
            <a href="https://receitas.globo.com/perfil/talitha-morete">Talitha Morete</a>
          </div>
        </div>
        <div class="recipe-description-labels__info">
          <svg><title>Dificuldade de preparo</title></svg>
          <span> Fácil </span>
        </div>

        <div class="content-subtitle">
          <h2 class="content-subtitle__title">Alcatra em tiras </h2>
        </div>
        <ul class="content-unordered-list">
          <li itemprop="recipeIngredient">800 gramas de alcatra em tiras</li>
          <li itemprop="recipeIngredient"> pimenta-do-reino a gosto</li>
          <li itemprop="recipeIngredient"> sal a gosto</li>
          <li itemprop="recipeIngredient">1 colher de chá de páprica defumada </li>
          <li itemprop="recipeIngredient"> tomilho a gosto</li>
          <li itemprop="recipeIngredient">1 colher de chá de alho em pó</li>
          <li itemprop="recipeIngredient">1 colher de chá de cebola em pó</li>
          <li itemprop="recipeIngredient"> azeite a gosto</li>
          <li itemprop="recipeIngredient"> pimenta-biquinho em conserva</li>
          <li itemprop="recipeIngredient">Meia colher de sopa de amido de milho</li>
        </ul>

        <div class="content-subtitle">
          <h2 class="content-subtitle__title">Molho de queijo </h2>
        </div>
        <ul class="content-unordered-list">
          <li itemprop="recipeIngredient">1 colher de sopa de manteiga</li>
          <li itemprop="recipeIngredient">6 dentes de alho</li>
          <li itemprop="recipeIngredient">300 mililitros de creme de leite fresco</li>
          <li itemprop="recipeIngredient">150 gramas de queijo muçarela ralado</li>
          <li itemprop="recipeIngredient">100 gramas de queijo parmesão ralado</li>
          <li itemprop="recipeIngredient">50 gramas de requeijão cremoso</li>
          <li itemprop="recipeIngredient"> cheiro-verde</li>
        </ul>

        <div class="content-subtitle">
          <h2 class="content-subtitle__title">Batata assada</h2>
        </div>
        <ul class="content-unordered-list">
          <li itemprop="recipeIngredient">500 gramas de batata-asterix cortadas em palitos grossos</li>
          <li itemprop="recipeIngredient"> páprica defumada a gosto</li>
          <li itemprop="recipeIngredient"> sal a gosto</li>
          <li itemprop="recipeIngredient"> alecrim a gosto</li>
          <li itemprop="recipeIngredient"> pimenta-do-reino a gosto</li>
          <li itemprop="recipeIngredient"> azeite a gosto</li>
        </ul>

        <div class="content-subtitle">
          <h3 class="content-subtitle__title"> Alcatra em tiras </h3>
        </div>
        <ol>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">1</span>
            <span class="recipeInstruction__text">Tempere as tiras de carne com sal, pimenta, páprica, alho e cebola em pó e tomilho picado </span>
          </li>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">2</span>
            <span class="recipeInstruction__text">Em uma frigideira com azeite, doure a alcatra e adicione a pimenta-biquinho fazendo pinga e frita e reservando o caldo e a carne. Adicione o amido no caldo da carne e volte para a frigideira que já estará com a carne misture ate ferver. </span>
          </li>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">3</span>
            <span class="recipeInstruction__text">Reserve.</span>
          </li>
        </ol>

        <div class="content-subtitle">
          <h3 class="content-subtitle__title"> Molho de queijo </h3>
        </div>
        <ol>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">1</span>
            <span class="recipeInstruction__text">Na mesma frigideira coloque manteiga, alho e deixe dourar. Adicione creme de leite, os queijos e misture bem ate derreter os queijos. </span>
          </li>
        </ol>

        <div class="content-subtitle">
          <h3 class="content-subtitle__title"> Batata assada </h3>
        </div>
        <ol>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">1</span>
            <span class="recipeInstruction__text">Transfira a batata cortada em palitos grossos e com casca para uma tigela e tempere com sal, pimenta-do-reino, páprica defumada, alecrim picado e azeite. </span>
          </li>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">2</span>
            <span class="recipeInstruction__text">Misture bem para que todos os pedaços fiquem envolvidos pelos temperos. </span>
          </li>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">3</span>
            <span class="recipeInstruction__text">Distribua as batatas em uma assadeira, sem sobrepor os pedaços. </span>
          </li>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">4</span>
            <span class="recipeInstruction__text">Leve ao forno preaquecido a 250 graus Célsius por 20 minutos, virando as batatas na metade do tempo.</span>
          </li>
          <li class="recipeInstruction" itemprop="recipeInstructions">
            <span class="recipeInstruction__index">5</span>
            <span class="recipeInstruction__text">Retire do forno e sirva acompanhando a alcatra em tiras com molho de queijo.</span>
          </li>
        </ol>
      </body>
    </html>
  `;

  it('reconhece links válidos do portal Receitas Globo como URLs suportadas', () => {
    expect(isStandaloneRecipeWebsiteUrl(talithaUrl)).toBe(true);
    expect(isStandaloneSupportedVideoUrl(talithaUrl)).toBe(true);
    expect(isStandaloneRecipeWebsiteUrl('Texto com link ' + talithaUrl)).toBe(false);
  });

  it('extrai todos os 23 ingredientes e 9 passos da Alcatra em tiras da Talitha Morete', () => {
    const metadata = extractRecipeWebsiteMetadataFromHtml(talithaUrl, talithaGloboHtml);
    expect(metadata.title).toBe(
      'Alcatra em tiras com molho de queijo e batatas assadas da Talitha Morete',
    );
    expect(metadata.authorName).toBe('Talitha Morete');
    expect(metadata.programName).toBe('É de Casa');
    expect(metadata.videoUrl).toBe('https://globoplay.globo.com/v/15168194/');
    expect(metadata.ingredients).toHaveLength(23);
    expect(metadata.ingredients[0]).toBe('800 gramas de alcatra em tiras (Alcatra em tiras)');
    expect(metadata.ingredients[9]).toBe(
      'Meia colher de sopa de amido de milho (Alcatra em tiras)',
    );
    expect(metadata.ingredients[10]).toBe('1 colher de sopa de manteiga (Molho de queijo)');
    expect(metadata.ingredients[17]).toBe(
      '500 gramas de batata-asterix cortadas em palitos grossos (Batata assada)',
    );
    expect(metadata.preparationSteps).toHaveLength(9);
    expect(metadata.preparationSteps[0]).toContain('[Alcatra em tiras] Tempere as tiras de carne');
    expect(metadata.preparationSteps[3]).toContain(
      '[Molho de queijo] Na mesma frigideira coloque manteiga',
    );
    expect(metadata.preparationSteps[7]).toContain('20 minutos');

    const draft = buildRecipeDraftFromWebsiteMetadata(metadata);
    expect(draft.category).toBe('Carnes');
    expect(draft.difficulty).toBe('Fácil');
    expect(draft.preparationMinutes).toBe(20);
    expect(draft.tags).toContain('Receitas Globo');
    expect(draft.tags).toContain('É de Casa');

    expect(
      scaleIngredientLineQuantity(
        'Meia colher de sopa de amido de milho (Alcatra em tiras)',
        4,
        8,
      ),
    ).toBe('1 colher de sopa de amido de milho (Alcatra em tiras)');
  });

  it('lança erro descritivo quando a URL do site está vazia', () => {
    expect(() => extractRecipeWebsiteMetadataFromHtml('   ', talithaGloboHtml)).toThrow(
      /URL do site de receita inválida/,
    );
  });

  it('extrai ingredientes, passos agrupados (HowToSection) e tempo ISO-8601 de páginas com JSON-LD schema.org/Recipe', () => {
    const jsonLdHtml = `
      <html>
        <head>
          <script type="application/ld+json">
            {
              "@context": "https://schema.org",
              "@type": "Recipe",
              "name": "Torta de Limão Clássica",
              "author": { "@type": "Person", "name": "Chef Rita" },
              "image": ["https://img.site.com/torta-limao.jpg"],
              "recipeCategory": "Sobremesas",
              "totalTime": "PT1H15M",
              "recipeYield": "10 fatias",
              "recipeIngredient": ["200g de biscoito maisena", "100g de manteiga", "1 lata de leite condensado", "Suco de 3 limões"],
              "recipeInstructions": [
                {
                  "@type": "HowToSection",
                  "name": "Base",
                  "itemListElement": [
                    { "@type": "HowToStep", "text": "Triture o biscoito e misture com a manteiga." }
                  ]
                },
                {
                  "@type": "HowToSection",
                  "name": "Recheio",
                  "itemListElement": [
                    { "@type": "HowToStep", "text": "Bata o leite condensado com o suco de limão." }
                  ]
                }
              ]
            }
          </script>
        </head>
      </html>
    `;
    const meta = extractRecipeWebsiteMetadataFromHtml(
      'https://www.tudogostoso.com.br/receita/torta-de-limao.html',
      jsonLdHtml,
    );
    expect(meta.title).toBe('Torta de Limão Clássica');
    expect(meta.authorName).toBe('Chef Rita');
    expect(meta.preparationMinutes).toBe(75);
    expect(meta.servingsCount).toBe(10);
    expect(meta.ingredients).toHaveLength(4);
    expect(meta.preparationSteps).toEqual([
      '[Base] Triture o biscoito e misture com a manteiga.',
      '[Recheio] Bata o leite condensado com o suco de limão.',
    ]);
  });
});
