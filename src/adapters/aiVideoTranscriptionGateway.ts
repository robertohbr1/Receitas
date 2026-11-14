import {
  AiSettingsRepository,
  AiTranscriptionApiKeysConfig,
  hasAnyConfiguredAiKey,
} from '../repositories/aiSettingsRepository';
import {
  buildGeminiMultimodalPrompt,
  formatAiPayloadAsFallbackText,
  parseStructuredAiRecipeResponse,
} from '../services/aiStructuredRecipeParser';
import { AiExtractedRecipePayload } from '../types/recipeTypes';

/**
 * Parâmetros de entrada para solicitar a transcrição de áudio de um vídeo social.
 */
export interface VideoTranscriptionRequest {
  readonly sourceUrl: string;
  readonly videoStreamUrl: string;
  readonly existingCaptionText: string;
}

/**
 * Contrato para serviços de transcrição de áudio e extração multimodal via IA (Gemini 2.5 / Groq Whisper).
 */
export interface AiVideoTranscriptionGateway {
  transcribeVideoIfConfigured(request: VideoTranscriptionRequest): Promise<string>;
  extractStructuredRecipeIfConfigured?(
    request: VideoTranscriptionRequest,
  ): Promise<AiExtractedRecipePayload | null>;
}

interface GeminiGenerateContentResponse {
  readonly candidates?: ReadonlyArray<{
    readonly content?: {
      readonly parts?: ReadonlyArray<{ readonly text?: string }>;
    };
  }>;
}

interface GroqWhisperJsonResponse {
  readonly text?: string;
}

/**
 * Implementação que utiliza as chaves cadastradas do Groq Whisper e/ou Gemini 2.5 Flash para transcrever vídeos.
 */
export class MultiProviderAiTranscriptionGateway implements AiVideoTranscriptionGateway {
  private readonly settingsRepository: AiSettingsRepository;

  public constructor(settingsRepository: AiSettingsRepository) {
    this.settingsRepository = settingsRepository;
  }

  /**
   * Transcreve o áudio do vídeo usando Groq Whisper ou Gemini 2.5 caso alguma API Key esteja configurada.
   *
   * @example
   * const text = await aiGateway.transcribeVideoIfConfigured({ sourceUrl, videoStreamUrl, existingCaptionText });
   */
  public async transcribeVideoIfConfigured(
    request: VideoTranscriptionRequest,
  ): Promise<string> {
    const keys = await this.settingsRepository.loadApiKeysConfig();
    if (!hasAnyConfiguredAiKey(keys)) {
      return '';
    }
    return executeProviderCascade(keys, request);
  }

  /**
   * Extrai título, ingredientes, passos e transcrição (áudio + texto na tela) em JSON via Gemini 2.5 Flash.
   *
   * @example
   * const structured = await aiGateway.extractStructuredRecipeIfConfigured({ sourceUrl, videoStreamUrl, existingCaptionText });
   */
  public async extractStructuredRecipeIfConfigured(
    request: VideoTranscriptionRequest,
  ): Promise<AiExtractedRecipePayload | null> {
    const keys = await this.settingsRepository.loadApiKeysConfig();
    if (!keys.geminiApiKey) {
      return null;
    }
    const rawGeminiText = await transcribeWithGemini25Flash(keys.geminiApiKey, request);
    return parseStructuredAiRecipeResponse(rawGeminiText);
  }
}

async function executeProviderCascade(
  keys: AiTranscriptionApiKeysConfig,
  request: VideoTranscriptionRequest,
): Promise<string> {
  if (keys.groqWhisperApiKey && request.videoStreamUrl) {
    const whisperText = await transcribeWithGroqWhisper(
      keys.groqWhisperApiKey,
      request.videoStreamUrl,
    );
    if (whisperText) {
      return whisperText;
    }
  }
  if (keys.geminiApiKey) {
    return resolveReadableGeminiTranscript(keys.geminiApiKey, request);
  }
  return '';
}

async function transcribeWithGroqWhisper(
  groqApiKey: string,
  videoStreamUrl: string,
): Promise<string> {
  try {
    const mediaBlob = await fetchVideoBlobWithProxyFallback(videoStreamUrl);
    if (!mediaBlob) return '';
    const formData = buildGroqWhisperFormData(mediaBlob);
    const response = await fetch('https://api.groq.com/openai/v1/audio/transcriptions', {
      method: 'POST',
      headers: { Authorization: `Bearer ${groqApiKey}` },
      body: formData,
    });
    if (!response.ok) return '';
    const data = (await response.json()) as GroqWhisperJsonResponse;
    return (data.text ?? '').trim();
  } catch {
    return '';
  }
}

function buildGroqWhisperFormData(mediaBlob: Blob): FormData {
  const formData = new FormData();
  formData.append('file', mediaBlob, 'recipe-video.mp4');
  formData.append('model', 'whisper-large-v3-turbo');
  formData.append('language', 'pt');
  formData.append('response_format', 'json');
  return formData;
}

async function transcribeWithGemini25Flash(
  geminiApiKey: string,
  request: VideoTranscriptionRequest,
): Promise<string> {
  try {
    const endpoint = `https://generativelanguage.googleapis.com/v1beta/models/gemini-2.5-flash:generateContent?key=${encodeURIComponent(geminiApiKey)}`;
    const base64Video = request.videoStreamUrl
      ? await fetchVideoBase64WithProxyFallback(request.videoStreamUrl)
      : '';
    const payload = buildGeminiRequestBody(request, base64Video);
    const response = await fetch(endpoint, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload),
    });
    if (!response.ok) return '';
    const data = (await response.json()) as GeminiGenerateContentResponse;
    return extractTextFromGeminiResponse(data);
  } catch {
    return '';
  }
}

async function resolveReadableGeminiTranscript(
  geminiApiKey: string,
  request: VideoTranscriptionRequest,
): Promise<string> {
  const rawResponse = await transcribeWithGemini25Flash(geminiApiKey, request);
  const structured = parseStructuredAiRecipeResponse(rawResponse);
  if (structured) {
    return structured.notesAndTranscript || formatAiPayloadAsFallbackText(structured);
  }
  return rawResponse;
}

function buildGeminiRequestBody(
  request: VideoTranscriptionRequest,
  base64Video: string,
): Record<string, unknown> {
  const prompt = buildGeminiMultimodalPrompt(request.sourceUrl, request.existingCaptionText);
  const parts: Array<Record<string, unknown>> = [{ text: prompt }];
  if (base64Video) {
    parts.unshift({
      inlineData: { mimeType: 'video/mp4', data: base64Video },
    });
  }
  return {
    contents: [{ parts }],
    generationConfig: { responseMimeType: 'application/json' },
  };
}

function extractTextFromGeminiResponse(data: GeminiGenerateContentResponse): string {
  const firstCandidate = data.candidates?.[0];
  const parts = firstCandidate?.content?.parts ?? [];
  return parts
    .map((part) => part.text ?? '')
    .join('\n')
    .trim();
}

async function fetchVideoBlobWithProxyFallback(videoStreamUrl: string): Promise<Blob | null> {
  const candidates = [
    `/api/instagram-media?url=${encodeURIComponent(videoStreamUrl)}`,
    videoStreamUrl,
  ];
  for (const url of candidates) {
    try {
      const response = await fetch(url);
      if (response.ok) return await response.blob();
    } catch {
      // Tenta próximo candidato
    }
  }
  return null;
}

async function fetchVideoBase64WithProxyFallback(videoStreamUrl: string): Promise<string> {
  const blob = await fetchVideoBlobWithProxyFallback(videoStreamUrl);
  if (!blob) return '';
  try {
    const buffer = await blob.arrayBuffer();
    return arrayBufferToBase64(buffer);
  } catch {
    return '';
  }
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  let binary = '';
  for (let i = 0; i < bytes.byteLength; i++) {
    binary += String.fromCharCode(bytes[i]);
  }
  return typeof btoa === 'function' ? btoa(binary) : '';
}
