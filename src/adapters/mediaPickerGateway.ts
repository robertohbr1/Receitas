import * as ImagePicker from 'expo-image-picker';

/**
 * Interface proprietária para seleção de fotos de capa e vídeos da galeria do celular.
 */
export interface MediaLibraryPickerGateway {
  pickCoverImageFromGallery(): Promise<string | null>;
  pickRecipeVideoFromGallery(): Promise<string | null>;
}

/**
 * Adaptador concreto que encapsula o expo-image-picker para seleção de mídia local.
 */
export class ExpoMediaLibraryPickerGateway implements MediaLibraryPickerGateway {
  /**
   * Abre a galeria do dispositivo para escolher uma imagem de capa da receita.
   *
   * @example
   * const imageUri = await mediaGateway.pickCoverImageFromGallery();
   */
  public async pickCoverImageFromGallery(): Promise<string | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return null;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['images'],
      allowsEditing: true,
      aspect: [16, 10],
      quality: 0.85,
    });
    return extractFirstAssetUri(pickerResult);
  }

  /**
   * Abre a galeria do dispositivo para escolher um arquivo de vídeo gravado no celular.
   *
   * @example
   * const videoUri = await mediaGateway.pickRecipeVideoFromGallery();
   */
  public async pickRecipeVideoFromGallery(): Promise<string | null> {
    const permission = await ImagePicker.requestMediaLibraryPermissionsAsync();
    if (!permission.granted) {
      return null;
    }
    const pickerResult = await ImagePicker.launchImageLibraryAsync({
      mediaTypes: ['videos'],
      allowsEditing: false,
      quality: 1,
    });
    return extractFirstAssetUri(pickerResult);
  }
}

function extractFirstAssetUri(
  pickerResult: ImagePicker.ImagePickerResult,
): string | null {
  if (pickerResult.canceled || !pickerResult.assets || pickerResult.assets.length === 0) {
    return null;
  }
  return pickerResult.assets[0].uri;
}
