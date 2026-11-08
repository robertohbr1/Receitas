import {
  classifyRecipeVideoUri,
  detectVideoProviderKind,
  extractInstagramShortcode,
  extractYoutubeVideoId,
  formatVideoProviderLabel,
  isLocalGalleryUri,
  resolveEmbeddedPlayerHeight,
} from '../src/services/videoUrlClassifier';

describe('videoUrlClassifier', () => {
  it('extrai o ID de 11 caracteres de URLs variadas do YouTube', () => {
    expect(extractYoutubeVideoId('https://www.youtube.com/watch?v=2Hj2h1rR2vY')).toBe(
      '2Hj2h1rR2vY',
    );
    expect(extractYoutubeVideoId('https://youtu.be/L1czfV3u9M8')).toBe('L1czfV3u9M8');
    expect(extractYoutubeVideoId('https://www.youtube.com/shorts/abc123DEF_-')).toBe(
      'abc123DEF_-',
    );
    expect(extractYoutubeVideoId('https://instagram.com/reel/123')).toBeNull();
  });

  it('extrai o shortcode de Reels, Posts e IGTV do Instagram', () => {
    expect(extractInstagramShortcode('https://www.instagram.com/reel/C8abc123/?igsh=xyz')).toBe(
      'C8abc123',
    );
    expect(extractInstagramShortcode('https://instagram.com/p/D1_xyz-99/')).toBe('D1_xyz-99');
    expect(extractInstagramShortcode('https://www.instagram.com/chef/reels/AbCdEf123/')).toBe(
      'AbCdEf123',
    );
    expect(extractInstagramShortcode('https://youtu.be/2Hj2h1rR2vY')).toBeNull();
  });

  it('identifica corretamente o provedor de vídeo a partir da URI', () => {
    expect(detectVideoProviderKind('')).toBe('none');
    expect(detectVideoProviderKind('file:///storage/emulated/0/DCIM/video.mp4')).toBe(
      'gallery_file',
    );
    expect(detectVideoProviderKind('https://youtu.be/L1czfV3u9M8')).toBe('youtube');
    expect(detectVideoProviderKind('https://www.instagram.com/reel/C999/')).toBe('instagram');
    expect(detectVideoProviderKind('https://www.tiktok.com/@chef/video/123')).toBe('tiktok');
    expect(detectVideoProviderKind('https://meusite.com.br/receita.mp4')).toBe('external_url');
  });

  it('reconhece esquemas locais da galeria do celular', () => {
    expect(isLocalGalleryUri('file:///var/mobile/media/video.mov')).toBe(true);
    expect(isLocalGalleryUri('content://media/external/video/media/42')).toBe(true);
    expect(isLocalGalleryUri('https://youtube.com/watch?v=2Hj2h1rR2vY')).toBe(false);
  });

  it('monta o descritor completo com embed e thumbnail para vídeos do YouTube e Instagram', () => {
    const descriptor = classifyRecipeVideoUri('https://youtu.be/2Hj2h1rR2vY');
    expect(descriptor.providerKind).toBe('youtube');
    expect(descriptor.embedUri).toBe('https://www.youtube.com/embed/2Hj2h1rR2vY');
    expect(descriptor.thumbnailUri).toBe(
      'https://img.youtube.com/vi/2Hj2h1rR2vY/hqdefault.jpg',
    );

    const instaDescriptor = classifyRecipeVideoUri('https://www.instagram.com/reel/C8abc123/');
    expect(instaDescriptor.providerKind).toBe('instagram');
    expect(instaDescriptor.embedUri).toBe('https://www.instagram.com/p/C8abc123/embed/');
  });

  it('retorna rótulos em português para todos os tipos de provedor', () => {
    expect(formatVideoProviderLabel('youtube')).toBe('Vídeo do YouTube');
    expect(formatVideoProviderLabel('instagram')).toBe('Reel do Instagram');
    expect(formatVideoProviderLabel('tiktok')).toBe('Vídeo do TikTok');
    expect(formatVideoProviderLabel('gallery_file')).toBe('Vídeo da Galeria (Offline)');
    expect(formatVideoProviderLabel('none')).toBe('Sem vídeo cadastrado');
  });

  it('calcula a altura do player embutido para Reels, Shorts e vídeos horizontais', () => {
    expect(resolveEmbeddedPlayerHeight('instagram', 'https://www.instagram.com/reel/C8abc/')).toBe(
      460,
    );
    expect(
      resolveEmbeddedPlayerHeight('youtube', 'https://www.youtube.com/shorts/eydMbeMvEe8'),
    ).toBe(420);
    expect(
      resolveEmbeddedPlayerHeight('youtube', 'https://www.youtube.com/watch?v=2Hj2h1rR2vY'),
    ).toBe(260);
  });
});
