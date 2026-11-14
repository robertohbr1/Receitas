import * as Clipboard from 'expo-clipboard';
import { Platform } from 'react-native';

/**
 * Interface proprietária para ler e gravar texto na Área de Transferência do aparelho.
 */
export interface ClipboardGateway {
  readClipboardText(): Promise<string>;
  writeClipboardText(text: string): Promise<void>;
}

/**
 * Adaptador concreto que encapsula o expo-clipboard com fallback para navegador Web.
 */
export class ExpoClipboardGateway implements ClipboardGateway {
  /**
   * Lê o texto atual copiado na Área de Transferência sem lançar erro se a permissão for negada.
   *
   * @example
   * const copied = await clipboardGateway.readClipboardText();
   */
  public async readClipboardText(): Promise<string> {
    try {
      const value = await Clipboard.getStringAsync();
      return (value ?? '').trim();
    } catch {
      return readWebClipboardSafely();
    }
  }

  /**
   * Copia o texto informado para a Área de Transferência no celular ou navegador.
   *
   * @example
   * await clipboardGateway.writeClipboardText('https://youtu.be/abc');
   */
  public async writeClipboardText(text: string): Promise<void> {
    if (!text) {
      return;
    }
    try {
      await Clipboard.setStringAsync(text);
    } catch {
      await writeWebClipboardSafely(text);
    }
  }
}

async function readWebClipboardSafely(): Promise<string> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard) {
    return '';
  }
  try {
    return (await navigator.clipboard.readText()).trim();
  } catch {
    return '';
  }
}

async function writeWebClipboardSafely(text: string): Promise<void> {
  if (Platform.OS !== 'web' || typeof navigator === 'undefined' || !navigator.clipboard) {
    return;
  }
  try {
    await navigator.clipboard.writeText(text);
  } catch {
    // Permissão de clipboard indisponível no navegador
  }
}
