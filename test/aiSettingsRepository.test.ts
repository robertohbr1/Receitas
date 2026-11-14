import { MultiProviderAiTranscriptionGateway } from '../src/adapters/aiVideoTranscriptionGateway';
import {
  AiSettingsRepository,
  hasAnyConfiguredAiKey,
} from '../src/repositories/aiSettingsRepository';
import { InMemoryStorageGateway } from './fakes/InMemoryStorageGateway';

describe('AiSettingsRepository & MultiProviderAiTranscriptionGateway', () => {
  it('inicia sem chaves de IA configuradas e detecta quando deve solicitar na entrada', async () => {
    const storage = new InMemoryStorageGateway();
    const repo = new AiSettingsRepository(storage);

    const initialConfig = await repo.loadApiKeysConfig();
    expect(initialConfig).toEqual({
      geminiApiKey: '',
      groqWhisperApiKey: '',
    });
    expect(hasAnyConfiguredAiKey(initialConfig)).toBe(false);
  });

  it('salva e carrega as 2 API Keys (Gemini 2.5 e Groq Whisper) removendo espaços extras', async () => {
    const storage = new InMemoryStorageGateway();
    const repo = new AiSettingsRepository(storage);

    const saved = await repo.saveApiKeysConfig({
      geminiApiKey: '  AIzaSyTestGemini25Key  ',
      groqWhisperApiKey: '  gsk_TestGroqWhisperKey  ',
    });

    expect(saved.geminiApiKey).toBe('AIzaSyTestGemini25Key');
    expect(saved.groqWhisperApiKey).toBe('gsk_TestGroqWhisperKey');
    expect(hasAnyConfiguredAiKey(saved)).toBe(true);

    const reloaded = await repo.loadApiKeysConfig();
    expect(reloaded).toEqual(saved);
  });

  it('continua normalmente retornando string vazia quando nenhuma API Key foi informada', async () => {
    const storage = new InMemoryStorageGateway();
    const repo = new AiSettingsRepository(storage);
    const gateway = new MultiProviderAiTranscriptionGateway(repo);

    const result = await gateway.transcribeVideoIfConfigured({
      sourceUrl: 'https://www.instagram.com/reel/DfX1iTFAX0m/',
      videoStreamUrl: 'https://scontent.cdninstagram.com/v/video.mp4',
      existingCaptionText: 'Receita no vídeo',
    });

    expect(result).toBe('');
  });
});
