import { KeyValueStorageGateway } from '../adapters/storageGateway';

export const AI_SETTINGS_STORAGE_KEY = '@caderno_receitas:ai_keys_v1';

/**
 * Chaves de API configuradas pelo usuário para transcrição de áudio de vídeos (Gemini 2.5 e Groq Whisper).
 */
export interface AiTranscriptionApiKeysConfig {
  readonly geminiApiKey: string;
  readonly groqWhisperApiKey: string;
}

/**
 * Verifica se pelo menos uma das chaves de IA (Gemini 2.5 ou Groq Whisper) foi preenchida.
 *
 * @example
 * const active = hasAnyConfiguredAiKey({ geminiApiKey: 'AIza...', groqWhisperApiKey: '' });
 * // active === true
 */
export function hasAnyConfiguredAiKey(config: AiTranscriptionApiKeysConfig): boolean {
  return (
    config.geminiApiKey.trim().length > 0 ||
    config.groqWhisperApiKey.trim().length > 0
  );
}

/**
 * Repositório responsável por persistir e carregar as chaves de API do Gemini-2.5 e Groq Whisper.
 */
export class AiSettingsRepository {
  private readonly storageGateway: KeyValueStorageGateway;
  private readonly storageKey: string;

  public constructor(
    storageGateway: KeyValueStorageGateway,
    storageKey: string = AI_SETTINGS_STORAGE_KEY,
  ) {
    this.storageGateway = storageGateway;
    this.storageKey = storageKey;
  }

  /**
   * Carrega as chaves de API salvas no dispositivo ou retorna valores vazios se ainda não cadastradas.
   *
   * @example
   * const keys = await aiSettingsRepo.loadApiKeysConfig();
   */
  public async loadApiKeysConfig(): Promise<AiTranscriptionApiKeysConfig> {
    const rawJson = await this.storageGateway.readRawString(this.storageKey);
    if (!rawJson) {
      return createEmptyApiKeysConfig();
    }
    return parseStoredApiKeysJson(rawJson);
  }

  /**
   * Salva ou atualiza as chaves de API do Gemini-2.5 e do Groq Whisper localmente.
   *
   * @example
   * await aiSettingsRepo.saveApiKeysConfig({ geminiApiKey: 'AIza...', groqWhisperApiKey: 'gsk_...' });
   */
  public async saveApiKeysConfig(
    input: AiTranscriptionApiKeysConfig,
  ): Promise<AiTranscriptionApiKeysConfig> {
    const sanitized: AiTranscriptionApiKeysConfig = {
      geminiApiKey: input.geminiApiKey.trim(),
      groqWhisperApiKey: input.groqWhisperApiKey.trim(),
    };
    await this.storageGateway.writeRawString(this.storageKey, JSON.stringify(sanitized));
    return sanitized;
  }
}

function createEmptyApiKeysConfig(): AiTranscriptionApiKeysConfig {
  return {
    geminiApiKey: '',
    groqWhisperApiKey: '',
  };
}

function parseStoredApiKeysJson(rawJson: string): AiTranscriptionApiKeysConfig {
  try {
    const parsed = JSON.parse(rawJson) as Partial<AiTranscriptionApiKeysConfig>;
    return {
      geminiApiKey: typeof parsed.geminiApiKey === 'string' ? parsed.geminiApiKey.trim() : '',
      groqWhisperApiKey:
        typeof parsed.groqWhisperApiKey === 'string' ? parsed.groqWhisperApiKey.trim() : '',
    };
  } catch {
    return createEmptyApiKeysConfig();
  }
}
