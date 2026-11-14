import { CulinaryRecipeRepository } from '../src/repositories/culinaryRecipeRepository';
import {
  decodeCatalogFromZipBase64,
  encodeCatalogToZipBase64,
} from '../src/services/zipBackupCodec';
import { RecipeDraftInput } from '../src/types/recipeTypes';
import { InMemoryOfflineMediaCacheGateway } from './fakes/InMemoryMediaAndClipboardFakes';
import { InMemoryStorageGateway } from './fakes/InMemoryStorageGateway';

function buildInstagramDraftWithStream(): RecipeDraftInput {
  return {
    title: 'Mousse de Maracujá Offline',
    category: 'Sobremesas',
    coverImageUri: 'https://scontent.cdninstagram.com/v/mousse.jpg',
    videoSourceUri: 'https://www.instagram.com/reel/Mousse01/',
    originalSourceUrl: 'https://www.instagram.com/reel/Mousse01/',
    offlineVideoStreamUrl: 'https://scontent.cdninstagram.com/v/mousse.mp4',
    preparationMinutes: 15,
    servingsCount: 6,
    difficulty: 'Fácil',
    ingredients: ['1 lata de leite condensado', '1 lata de creme de leite'],
    preparationSteps: ['Bata tudo no liquidificador por 3 minutos'],
    unifiedChefNotesAndNutrition: 'Geladeira por 2 horas.',
    tags: ['Instagram', 'Sobremesas'],
  };
}

describe('Cache offline de mídia e Backup ZIP portável', () => {
  it('salva capa remotamente em pasta persistente ao criar receita e baixa vídeo MP4 offline', async () => {
    const storage = new InMemoryStorageGateway();
    const mediaCache = new InMemoryOfflineMediaCacheGateway();
    const repo = new CulinaryRecipeRepository(storage, mediaCache);

    const created = await repo.createRecipe(buildInstagramDraftWithStream(), 'rec-mousse-01');
    expect(created.coverImageUri).toBe('file:///document/recipes-media/rec-mousse-01/cover.jpg');
    expect(created.archivedAtIso).toBeTruthy();

    const withOfflineVideo = await repo.saveOfflineVideoForRecipe('rec-mousse-01');
    expect(withOfflineVideo.videoSourceUri).toBe(
      'file:///document/recipes-media/rec-mousse-01/video.mp4',
    );
    expect(withOfflineVideo.originalSourceUrl).toBe('https://www.instagram.com/reel/Mousse01/');
    expect(mediaCache.downloadedUrls).toEqual([
      'https://scontent.cdninstagram.com/v/mousse.mp4',
    ]);
  });

  it('persiste vídeo selecionado da galeria para armazenamento permanente ao atualizar receita', async () => {
    const storage = new InMemoryStorageGateway();
    const mediaCache = new InMemoryOfflineMediaCacheGateway();
    const repo = new CulinaryRecipeRepository(storage, mediaCache);

    await repo.createRecipe(buildInstagramDraftWithStream(), 'rec-gal-02');
    const updated = await repo.updateExistingRecipe('rec-gal-02', {
      ...buildInstagramDraftWithStream(),
      videoSourceUri: 'file:///cache/ImagePicker/temp-clip.mp4',
    });

    expect(updated.videoSourceUri).toBe('file:///document/recipes-media/rec-gal-02/video.mp4');
  });

  it('exporta catálogo completo em .zip com mídias locais e restaura em outro repositório', async () => {
    const sourceStorage = new InMemoryStorageGateway();
    const sourceMediaCache = new InMemoryOfflineMediaCacheGateway();
    const sourceRepo = new CulinaryRecipeRepository(sourceStorage, sourceMediaCache);

    await sourceRepo.createRecipe(buildInstagramDraftWithStream(), 'rec-zip-01');
    await sourceRepo.saveOfflineVideoForRecipe('rec-zip-01');

    const zipBase64 = await sourceRepo.exportCatalogZipBase64();
    expect(zipBase64.length).toBeGreaterThan(50);

    const targetStorage = new InMemoryStorageGateway();
    const targetMediaCache = new InMemoryOfflineMediaCacheGateway();
    const targetRepo = new CulinaryRecipeRepository(targetStorage, targetMediaCache);

    const restoredList = await targetRepo.importCatalogZipBase64(zipBase64);
    const restored = restoredList.find((r) => r.id === 'rec-zip-01');
    expect(restored).toBeDefined();
    expect(restored?.coverImageUri).toBe('file:///restored/recipes-media/rec-zip-01/cover.jpg');
    expect(restored?.videoSourceUri).toBe('file:///restored/recipes-media/rec-zip-01/video.mp4');
    expect(await targetMediaCache.readLocalFileAsBase64(restored!.videoSourceUri)).toBeTruthy();
  });

  it('rejeita arquivo ZIP vazio ou corrompido com mensagem descritiva', async () => {
    const mediaCache = new InMemoryOfflineMediaCacheGateway();
    await expect(decodeCatalogFromZipBase64('   ', mediaCache)).rejects.toThrow(
      /Conteúdo ZIP vazio/,
    );
    await expect(decodeCatalogFromZipBase64('bm90LWEtemlw', mediaCache)).rejects.toThrow(
      /Arquivo ZIP corrompido/,
    );

    const emptyZip = await encodeCatalogToZipBase64([], mediaCache);
    await expect(decodeCatalogFromZipBase64(emptyZip, mediaCache)).rejects.toThrow(
      /inválido ou vazio/,
    );
  });
});
