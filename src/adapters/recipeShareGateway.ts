import { Share } from 'react-native';
import * as Print from 'expo-print';
import * as Sharing from 'expo-sharing';
import { CulinaryRecipeRecord } from '../types/recipeTypes';
import {
  formatRecipeAsPrintableHtml,
  formatRecipeAsShareableText,
} from '../services/recipeFormatter';

/**
 * Contrato para compartilhamento externo de receitas em texto ou arquivo PDF.
 */
export interface RecipeExportGateway {
  shareRecipeAsText(recipe: CulinaryRecipeRecord): Promise<void>;
  exportRecipeAsPdf(recipe: CulinaryRecipeRecord): Promise<string>;
}

/**
 * Adaptador concreto que integra o menu nativo de compartilhamento e geração de PDF via Expo.
 */
export class ExpoRecipeExportGateway implements RecipeExportGateway {
  /**
   * Abre a folha de compartilhamento nativa do celular com a receita formatada em texto.
   *
   * @example
   * await exportGateway.shareRecipeAsText(selectedRecipe);
   */
  public async shareRecipeAsText(recipe: CulinaryRecipeRecord): Promise<void> {
    const messageBody = formatRecipeAsShareableText(recipe);
    await Share.share({
      title: recipe.title,
      message: messageBody,
    });
  }

  /**
   * Gera um arquivo PDF estilizado da receita e abre o compartilhamento de arquivo se disponível.
   *
   * @example
   * const pdfUri = await exportGateway.exportRecipeAsPdf(selectedRecipe);
   */
  public async exportRecipeAsPdf(recipe: CulinaryRecipeRecord): Promise<string> {
    const htmlDocument = formatRecipeAsPrintableHtml(recipe);
    const generatedPdf = await Print.printToFileAsync({ html: htmlDocument });
    const canShareFile = await Sharing.isAvailableAsync();
    if (canShareFile) {
      await Sharing.shareAsync(generatedPdf.uri, {
        mimeType: 'application/pdf',
        dialogTitle: `Exportar PDF - ${recipe.title}`,
      });
    }
    return generatedPdf.uri;
  }
}
