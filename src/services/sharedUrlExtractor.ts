import { isStandaloneSupportedVideoUrl } from '../adapters/youtubeMetadataGateway';

/**
 * Extrai a primeira URL suportada (YouTube, Instagram ou site culinário) dentro de um texto compartilhado.
 *
 * @example
 * const url = extractSupportedRecipeUrlFromSharedText('Olha esse bolo! https://youtu.be/2Hj2h1rR2vY');
 * // url === 'https://youtu.be/2Hj2h1rR2vY'
 */
export function extractSupportedRecipeUrlFromSharedText(rawText: string): string | null {
  const matches = rawText.match(/https?:\/\/[^\s<>"']+/gi);
  if (!matches) {
    return null;
  }
  for (const candidate of matches) {
    const cleaned = candidate.replace(/[),.!?;:]+$/, '');
    if (isStandaloneSupportedVideoUrl(cleaned)) {
      return cleaned;
    }
  }
  return null;
}