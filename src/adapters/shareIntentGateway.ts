import { useEffect } from 'react';
import { Platform } from 'react-native';
import { useShareIntent } from 'expo-share-intent';
import { extractSupportedRecipeUrlFromSharedText } from '../services/sharedUrlExtractor';

export { extractSupportedRecipeUrlFromSharedText } from '../services/sharedUrlExtractor';

/**
 * Escuta links compartilhados de outros apps (YouTube, Instagram, Chrome) via menu nativo Compartilhar.
 *
 * @example
 * useIncomingShareIntentListener((url) => void quickImportFromUrl(url));
 */
export function useIncomingShareIntentListener(
  onSupportedUrlReceived: (url: string) => void,
): void {
  const { hasShareIntent, shareIntent, resetShareIntent } = useShareIntent({
    disabled: Platform.OS === 'web',
    resetOnBackground: true,
  });

  useEffect(() => {
    if (!hasShareIntent) {
      return;
    }
    const rawCandidate = shareIntent.webUrl ?? shareIntent.text ?? '';
    const extractedUrl = extractSupportedRecipeUrlFromSharedText(rawCandidate);
    resetShareIntent();
    if (extractedUrl) {
      onSupportedUrlReceived(extractedUrl);
    }
  }, [hasShareIntent, shareIntent, resetShareIntent, onSupportedUrlReceived]);
}
