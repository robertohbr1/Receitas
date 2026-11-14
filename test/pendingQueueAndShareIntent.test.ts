import { isStandaloneSupportedVideoUrl } from '../src/adapters/youtubeMetadataGateway';
import { PendingImportQueueRepository } from '../src/repositories/pendingImportQueueRepository';
import { isStandaloneRecipeWebsiteUrl } from '../src/services/recipeWebsiteParser';
import { extractSupportedRecipeUrlFromSharedText } from '../src/services/sharedUrlExtractor';
import { InMemoryClipboardGateway } from './fakes/InMemoryMediaAndClipboardFakes';
import { InMemoryStorageGateway } from './fakes/InMemoryStorageGateway';

describe('Fila de links pendentes, Share Intent URL e sites genéricos Schema.org', () => {
  it('adiciona links na fila offline sem duplicar a mesma URL e remove após importar', async () => {
    const storage = new InMemoryStorageGateway();
    const queue = new PendingImportQueueRepository(storage);

    await queue.enqueuePendingUrl('https://youtu.be/2Hj2h1rR2vY', 'Sem conexão');
    const deduplicated = await queue.enqueuePendingUrl(
      'https://youtu.be/2Hj2h1rR2vY',
      'Timeout de rede',
    );
    expect(deduplicated).toHaveLength(1);
    expect(deduplicated[0].lastErrorMessage).toBe('Timeout de rede');

    await queue.enqueuePendingUrl('https://www.instagram.com/reel/C8abc123/', 'Bloqueio');
    const loaded = await queue.loadPendingImports();
    expect(loaded).toHaveLength(2);

    const afterRemove = await queue.removePendingImportById(loaded[0].id);
    expect(afterRemove).toHaveLength(1);
  });

  it('rejeita URL inválida ao enfileirar pendente com erro descritivo', async () => {
    const queue = new PendingImportQueueRepository(new InMemoryStorageGateway());
    await expect(queue.enqueuePendingUrl('link-invalido', 'erro')).rejects.toThrow(
      /URL inválida para fila offline/,
    );
  });

  it('extrai a URL suportada mesmo quando vem acompanhada de texto no menu Compartilhar', () => {
    const sharedFromYoutube =
      'Pão de queijo incrível! Confira: https://www.youtube.com/shorts/eydMbeMvEe8.';
    expect(extractSupportedRecipeUrlFromSharedText(sharedFromYoutube)).toBe(
      'https://www.youtube.com/shorts/eydMbeMvEe8',
    );

    const sharedFromBlog =
      'Olha essa receita https://meubloggourmet.com.br/bolo-fuba-cremoso/, vale a pena!';
    expect(extractSupportedRecipeUrlFromSharedText(sharedFromBlog)).toBe(
      'https://meubloggourmet.com.br/bolo-fuba-cremoso/',
    );

    expect(extractSupportedRecipeUrlFromSharedText('Apenas texto sem link')).toBeNull();
  });

  it('aceita qualquer blog ou site de receitas genérico sem depender de domínio fixo', () => {
    expect(isStandaloneRecipeWebsiteUrl('https://cookingblog.org/posts/torta-maca/')).toBe(true);
    expect(isStandaloneSupportedVideoUrl('https://cookingblog.org/posts/torta-maca/')).toBe(true);
    expect(isStandaloneRecipeWebsiteUrl('https://www.youtube.com/watch?v=2Hj2h1rR2vY')).toBe(
      false,
    );
    expect(isStandaloneRecipeWebsiteUrl('Texto com link https://cookingblog.org/bolo')).toBe(false);
  });

  it('simula leitura e escrita na área de transferência via ClipboardGateway fake', async () => {
    const clipboard = new InMemoryClipboardGateway('  https://youtu.be/2Hj2h1rR2vY  ');
    const detected = extractSupportedRecipeUrlFromSharedText(await clipboard.readClipboardText());
    expect(detected).toBe('https://youtu.be/2Hj2h1rR2vY');

    await clipboard.writeClipboardText('[]');
    expect(await clipboard.readClipboardText()).toBe('[]');
  });
});
