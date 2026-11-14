import React, { useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import {
  isStandaloneSupportedVideoUrl,
  resolveSocialRecipeDraftFromUrl,
  YoutubeVideoMetadataGateway,
} from '../adapters/youtubeMetadataGateway';
import { parseFreeformRecipeText } from '../services/recipeTextParser';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';
import { ParsedRecipeTextResult, RecipeDraftInput } from '../types/recipeTypes';

export interface SmartImportModalProps {
  readonly visible: boolean;
  readonly palette: GastronomicColorPalette;
  readonly youtubeGateway: YoutubeVideoMetadataGateway;
  readonly onClose: () => void;
  readonly onApplyParsedRecipe: (parsed: ParsedRecipeTextResult) => void;
  readonly onApplyYoutubeDraft: (draft: RecipeDraftInput) => void;
}

/**
 * Modal onde o usuário cola um link do YouTube/Instagram ou legenda de vídeo/site e extrai a receita.
 *
 * @example
 * <SmartImportModal visible={isOpen} palette={palette} youtubeGateway={ytGateway} ... />
 */
export function SmartImportModal(props: SmartImportModalProps): React.ReactElement {
  const [pastedText, setPastedText] = useState<string>('');
  const [isLoading, setIsLoading] = useState<boolean>(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);

  const processInput = async (): Promise<void> => {
    setErrorMessage(null);
    if (isStandaloneSupportedVideoUrl(pastedText)) {
      await extractFromSocialUrl(pastedText, props, setIsLoading, setPastedText, setErrorMessage);
      return;
    }
    extractFromFreeformText(pastedText, props.onApplyParsedRecipe, setPastedText, setErrorMessage);
  };

  return (
    <Modal visible={props.visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <ImportModalCard
          palette={props.palette}
          pastedText={pastedText}
          isLoading={isLoading}
          errorMessage={errorMessage}
          onChangeText={setPastedText}
          onClose={props.onClose}
          onConfirm={() => void processInput()}
        />
      </View>
    </Modal>
  );
}

async function extractFromSocialUrl(
  url: string,
  props: SmartImportModalProps,
  setIsLoading: (v: boolean) => void,
  setPastedText: (v: string) => void,
  setErrorMessage: (v: string | null) => void,
): Promise<void> {
  setIsLoading(true);
  try {
    const draft = await resolveSocialRecipeDraftFromUrl(url, props.youtubeGateway);
    setPastedText('');
    props.onApplyYoutubeDraft(draft);
  } catch (err) {
    setErrorMessage(err instanceof Error ? err.message : 'Falha ao importar link');
  } finally {
    setIsLoading(false);
  }
}

function extractFromFreeformText(
  rawText: string,
  onApplyParsed: (parsed: ParsedRecipeTextResult) => void,
  setPastedText: (v: string) => void,
  setErrorMessage: (v: string | null) => void,
): void {
  try {
    const result = parseFreeformRecipeText(rawText);
    setPastedText('');
    onApplyParsed(result);
  } catch (err) {
    setErrorMessage(err instanceof Error ? err.message : 'Texto inválido');
  }
}

function ImportModalCard(props: {
  readonly palette: GastronomicColorPalette;
  readonly pastedText: string;
  readonly isLoading: boolean;
  readonly errorMessage: string | null;
  readonly onChangeText: (val: string) => void;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={[styles.modalCard, { backgroundColor: palette.backgroundCard }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>
        ✨ Importar Link (YouTube, Instagram, Receitas Globo) ou Texto
      </Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Cole um link do YouTube, Reel do Instagram, Receitas Globo ou o texto completo da receita:
        vamos extrair título, foto, ingredientes e modo de preparo automaticamente!
      </Text>
      <TextInput
        multiline
        value={props.pastedText}
        onChangeText={props.onChangeText}
        placeholder={
          'Cole o link (YouTube, Instagram ou Receitas Globo):\nhttps://receitas.globo.com/...\n\nOu cole os ingredientes e modo de preparo.'
        }
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.textArea,
          {
            backgroundColor: palette.backgroundPrimary,
            color: palette.textPrimary,
            borderColor: palette.borderSubtle,
          },
        ]}
      />
      {props.errorMessage && (
        <Text style={[styles.errorText, { color: palette.dangerCrimson }]}>
          {props.errorMessage}
        </Text>
      )}
      <ModalFooterButtons
        palette={palette}
        isLoading={props.isLoading}
        onClose={props.onClose}
        onConfirm={props.onConfirm}
      />
    </View>
  );
}

function ModalFooterButtons(props: {
  readonly palette: GastronomicColorPalette;
  readonly isLoading: boolean;
  readonly onClose: () => void;
  readonly onConfirm: () => void;
}): React.ReactElement {
  const { palette, isLoading } = props;
  return (
    <View style={styles.buttonsRow}>
      <TouchableOpacity
        disabled={isLoading}
        onPress={props.onClose}
        style={[styles.cancelBtn, { borderColor: palette.borderSubtle }]}
      >
        <Text style={[styles.cancelBtnText, { color: palette.textSecondary }]}>Cancelar</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={isLoading}
        onPress={props.onConfirm}
        style={[styles.confirmBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.confirmBtnText}>
          {isLoading ? 'Buscando no YouTube...' : 'Extrair Receita'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 18 },
  modalCard: { borderRadius: 16, padding: 18 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  textArea: { height: 180, borderWidth: 1, borderRadius: 10, padding: 12, textAlignVertical: 'top', fontSize: 14 },
  errorText: { fontSize: 12, marginTop: 8, fontWeight: '600' },
  buttonsRow: { flexDirection: 'row', justifyContent: 'flex-end', gap: 10, marginTop: 14 },
  cancelBtn: { paddingVertical: 10, paddingHorizontal: 16, borderRadius: 10, borderWidth: 1 },
  cancelBtnText: { fontWeight: '600', fontSize: 14 },
  confirmBtn: { paddingVertical: 10, paddingHorizontal: 18, borderRadius: 10 },
  confirmBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});