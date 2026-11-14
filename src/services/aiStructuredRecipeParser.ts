import { AiExtractedRecipePayload } from '../types/recipeTypes';

interface RawAiRecipeJson {
  readonly title?: unknown;
  readonly preparationMinutes?: unknown;
  readonly servingsCount?: unknown;
  readonly ingredients?: unknown;
  readonly preparationSteps?: unknown;
  readonly notesAndTranscript?: unknown;
}

/**
 * Constrói o prompt multimodal para o Gemini 2.5 Flash extrair fala, texto na tela (OCR) e JSON estruturado.
 *
 * @example
 * const prompt = buildGeminiMultimodalPrompt('https://instagram.com/reel/abc', 'Bolo rápido');
 */
export function buildGeminiMultimodalPrompt(
  sourceUrl: string,
  existingCaptionText: string,
): string {
  const captionHint = existingCaptionText.trim()
    ? `\nLegenda já encontrada:\n${existingCaptionText.trim()}`
    : '';
  return [
    'Analise TODO o vídeo: escute o áudio falado E leia TODO texto visível na tela (OCR dos quadros, legendas embutidas e ingredientes escritos).',
    'Responda APENAS com um JSON válido em português no formato exato:',
    '{"title": string, "preparationMinutes": number | null, "servingsCount": number | null, "ingredients": string[], "preparationSteps": string[], "notesAndTranscript": string}.',
    'Preserve quantidades exatas nos ingredientes, seções entre parênteses (ex: "2 ovos (Massa)") ou colchetes nos passos ("[Massa] Bata..."), e inclua em notesAndTranscript a transcrição fiel + dicas.',
    `URL: ${sourceUrl}${captionHint}`,
  ].join('\n');
}

/**
 * Interpreta a resposta JSON (ou bloco cercado por ```json) da IA multimodal em AiExtractedRecipePayload.
 *
 * @example
 * const payload = parseStructuredAiRecipeResponse('{"title":"Pudim","ingredients":["1 lata de leite condensado"],"preparationSteps":["Bata tudo"]}');
 * // payload?.title === 'Pudim'
 */
export function parseStructuredAiRecipeResponse(
  rawResponseText: string,
): AiExtractedRecipePayload | null {
  const cleanedJson = stripMarkdownCodeFences(rawResponseText);
  if (!cleanedJson.startsWith('{')) {
    return null;
  }
  try {
    const parsed = JSON.parse(cleanedJson) as RawAiRecipeJson;
    return mapRawJsonToPayload(parsed);
  } catch {
    return null;
  }
}

function stripMarkdownCodeFences(rawText: string): string {
  const trimmed = rawText.trim();
  const fencedMatch = trimmed.match(/^```(?:json)?\s*([\s\S]*?)\s*```$/i);
  if (fencedMatch && fencedMatch[1]) {
    return fencedMatch[1].trim();
  }
  const firstBrace = trimmed.indexOf('{');
  const lastBrace = trimmed.lastIndexOf('}');
  if (firstBrace !== -1 && lastBrace > firstBrace) {
    return trimmed.slice(firstBrace, lastBrace + 1);
  }
  return trimmed;
}

function mapRawJsonToPayload(raw: RawAiRecipeJson): AiExtractedRecipePayload | null {
  const ingredients = normalizeStringList(raw.ingredients);
  const preparationSteps = normalizeStringList(raw.preparationSteps);
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const notesAndTranscript =
    typeof raw.notesAndTranscript === 'string' ? raw.notesAndTranscript.trim() : '';
  if (!title && ingredients.length === 0 && preparationSteps.length === 0 && !notesAndTranscript) {
    return null;
  }
  return {
    title,
    preparationMinutes: normalizePositiveNumberOrNull(raw.preparationMinutes),
    servingsCount: normalizePositiveNumberOrNull(raw.servingsCount),
    ingredients,
    preparationSteps,
    notesAndTranscript,
  };
}

function normalizeStringList(candidate: unknown): string[] {
  if (!Array.isArray(candidate)) {
    return [];
  }
  return candidate
    .map((item) => (typeof item === 'string' ? item.trim() : String(item ?? '').trim()))
    .filter((item) => item.length > 0);
}

function normalizePositiveNumberOrNull(candidate: unknown): number | null {
  if (typeof candidate === 'number' && Number.isFinite(candidate) && candidate > 0) {
    return Math.round(candidate);
  }
  if (typeof candidate === 'string') {
    const parsed = parseInt(candidate.trim(), 10);
    return Number.isFinite(parsed) && parsed > 0 ? parsed : null;
  }
  return null;
}

/**
 * Formata um payload estruturado de IA como texto legível para transcrição e notas.
 *
 * @example
 * const text = formatAiPayloadAsFallbackText(payload);
 */
export function formatAiPayloadAsFallbackText(payload: AiExtractedRecipePayload): string {
  const sections: string[] = [];
  if (payload.title) sections.push(payload.title);
  if (payload.ingredients.length > 0) {
    sections.push(`Ingredientes:\n${payload.ingredients.join('\n')}`);
  }
  if (payload.preparationSteps.length > 0) {
    sections.push(`Modo de preparo:\n${payload.preparationSteps.join('\n')}`);
  }
  if (payload.notesAndTranscript) {
    sections.push(payload.notesAndTranscript);
  }
  return sections.join('\n\n').trim();
}