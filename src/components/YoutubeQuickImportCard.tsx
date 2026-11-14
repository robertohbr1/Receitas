import React, { useState } from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { isStandaloneSupportedVideoUrl } from '../adapters/youtubeMetadataGateway';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface YoutubeQuickImportCardProps {
  readonly palette: GastronomicColorPalette;
  readonly isFetching: boolean;
  readonly onAutoFillFromYoutube: (youtubeUrl: string) => Promise<void>;
  readonly onOneClickCreateFromYoutube: (youtubeUrl: string) => Promise<void>;
  readonly onReadClipboardText?: () => Promise<string>;
}

/**
 * Painel em destaque para criar ou preencher toda a receita colando qualquer link de vídeo ou site culinário.
 *
 * @example
 * <YoutubeQuickImportCard palette={palette} isFetching={false} onAutoFillFromYoutube={fill} ... />
 */
export function YoutubeQuickImportCard(
  props: YoutubeQuickImportCardProps,
): React.ReactElement {
  const [youtubeLink, setYoutubeLink] = useState<string>('');
  const { palette, isFetching } = props;

  const handleLinkInput = (text: string): void => {
    setYoutubeLink(text);
    if (isStandaloneSupportedVideoUrl(text) && !isFetching) {
      void props.onAutoFillFromYoutube(text.trim());
    }
  };

  const pasteClipboardAndFill = async (): Promise<void> => {
    if (!props.onReadClipboardText || isFetching) return;
    const copied = (await props.onReadClipboardText()).trim();
    if (copied) handleLinkInput(copied);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.backgroundElevated, borderColor: palette.accentTerracotta },
      ]}
    >
      <Text style={[styles.title, { color: palette.accentTerracotta }]}>
        🎬 Importar por Link (YouTube, Instagram ou Qualquer Site)
      </Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Cole o link do vídeo, Reel ou site de receitas abaixo: extraímos título, foto de capa,
        ingredientes e modo de preparo automaticamente!
      </Text>
      <View style={styles.inputRow}>
        <TextInput
          value={youtubeLink}
          onChangeText={handleLinkInput}
          placeholder="Cole: youtube.com/..., instagram.com/reel/... ou blog/site..."
          placeholderTextColor={palette.textSecondary}
          autoCapitalize="none"
          style={[
            styles.input,
            {
              backgroundColor: palette.backgroundCard,
              color: palette.textPrimary,
              borderColor: palette.borderSubtle,
            },
          ]}
        />
        {props.onReadClipboardText && (
          <TouchableOpacity
            disabled={isFetching}
            onPress={() => void pasteClipboardAndFill()}
            style={[styles.pasteBtn, { borderColor: palette.accentTerracotta }]}
          >
            <Text style={[styles.pasteBtnText, { color: palette.accentTerracotta }]}>📋 Colar</Text>
          </TouchableOpacity>
        )}
      </View>
      <YoutubeActionButtons
        youtubeLink={youtubeLink}
        isFetching={isFetching}
        palette={palette}
        onAutoFill={() => void props.onAutoFillFromYoutube(youtubeLink)}
        onCreateDirectly={() => void props.onOneClickCreateFromYoutube(youtubeLink)}
      />
    </View>
  );
}

function YoutubeActionButtons(props: {
  readonly youtubeLink: string;
  readonly isFetching: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onAutoFill: () => void;
  readonly onCreateDirectly: () => void;
}): React.ReactElement {
  const { palette, isFetching, youtubeLink } = props;
  if (isFetching) {
    return (
      <View style={styles.loadingRow}>
        <ActivityIndicator size="small" color={palette.accentTerracotta} />
        <Text style={[styles.loadingText, { color: palette.accentTerracotta }]}>
          Lendo descrição, ingredientes e capa do vídeo no YouTube...
        </Text>
      </View>
    );
  }
  const isDisabled = !youtubeLink.trim();
  return (
    <View style={styles.buttonsRow}>
      <TouchableOpacity
        disabled={isDisabled}
        onPress={props.onAutoFill}
        style={[
          styles.secondaryBtn,
          { backgroundColor: palette.backgroundCard, borderColor: palette.accentTerracotta },
        ]}
      >
        <Text style={[styles.secondaryBtnText, { color: palette.accentTerracotta }]}>
          ⚡ Preencher Campos
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={isDisabled}
        onPress={props.onCreateDirectly}
        style={[styles.primaryBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.primaryBtnText}>🚀 Criar Receita Direto</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1.5, padding: 14, marginBottom: 18 },
  title: { fontSize: 15, fontWeight: '800', marginBottom: 4 },
  subtitle: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  inputRow: { flexDirection: 'row', gap: 8, alignItems: 'center', marginBottom: 10 },
  input: { flex: 1, borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  pasteBtn: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 10, paddingVertical: 10 },
  pasteBtnText: { fontSize: 12, fontWeight: '700' },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  loadingText: { fontSize: 12, fontWeight: '700' },
  buttonsRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  secondaryBtnText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});