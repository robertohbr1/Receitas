import * as DocumentPicker from 'expo-document-picker';
import * as FileSystem from 'expo-file-system';
import { Platform } from 'react-native';

/**
 * Representa um arquivo de backup (.json ou .zip) escolhido pelo usuário.
 */
export type PickedBackupDocument =
  | { readonly format: 'json'; readonly filename: string; readonly jsonText: string }
  | { readonly format: 'zip'; readonly filename: string; readonly zipBase64: string };

/**
 * Contrato proprietário para seleção e leitura de arquivos de backup (.json ou .zip).
 */
export interface BackupDocumentPickerGateway {
  pickBackupFile(): Promise<PickedBackupDocument | null>;
}

/**
 * Adaptador concreto que encapsula o expo-document-picker para importar backups em arquivo.
 */
export class ExpoBackupDocumentPickerGateway implements BackupDocumentPickerGateway {
  /**
   * Abre o seletor de arquivos do dispositivo aceitando .json e .zip e retorna o conteúdo lido.
   *
   * @example
   * const picked = await pickerGateway.pickBackupFile();
   */
  public async pickBackupFile(): Promise<PickedBackupDocument | null> {
    const result = await DocumentPicker.getDocumentAsync({
      type: ['application/json', 'application/zip', 'application/x-zip-compressed', '*/*'],
      copyToCacheDirectory: true,
      multiple: false,
    });
    if (result.canceled || !result.assets || result.assets.length === 0) {
      return null;
    }
    return readPickedAsset(result.assets[0]);
  }
}

async function readPickedAsset(
  asset: DocumentPicker.DocumentPickerAsset,
): Promise<PickedBackupDocument> {
  const isZip = isZipBackupAsset(asset.name, asset.mimeType);
  if (Platform.OS === 'web' && asset.file) {
    return readWebPickedFile(asset.file, asset.name, isZip);
  }
  if (isZip) {
    const zipBase64 = await FileSystem.readAsStringAsync(asset.uri, {
      encoding: FileSystem.EncodingType.Base64,
    });
    return { format: 'zip', filename: asset.name, zipBase64 };
  }
  const jsonText = await FileSystem.readAsStringAsync(asset.uri, {
    encoding: FileSystem.EncodingType.UTF8,
  });
  return { format: 'json', filename: asset.name, jsonText };
}

function isZipBackupAsset(filename: string, mimeType?: string): boolean {
  const lowerName = filename.toLowerCase();
  const lowerMime = (mimeType ?? '').toLowerCase();
  return lowerName.endsWith('.zip') || lowerMime.includes('zip');
}

async function readWebPickedFile(
  file: File,
  filename: string,
  isZip: boolean,
): Promise<PickedBackupDocument> {
  if (!isZip) {
    return { format: 'json', filename, jsonText: await file.text() };
  }
  const buffer = await file.arrayBuffer();
  return { format: 'zip', filename, zipBase64: arrayBufferToBase64(buffer) };
}

function arrayBufferToBase64(buffer: ArrayBuffer): string {
  const bytes = new Uint8Array(buffer);
  const chunkSize = 0x8000;
  let binary = '';
  for (let offset = 0; offset < bytes.length; offset += chunkSize) {
    binary += String.fromCharCode(...bytes.subarray(offset, offset + chunkSize));
  }
  return typeof btoa === 'function' ? btoa(binary) : '';
}
