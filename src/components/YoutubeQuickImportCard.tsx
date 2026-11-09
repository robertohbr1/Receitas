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
}

/**
 * Painel em destaque para criar ou preencher toda a receita apenas colando um link do YouTube ou Instagram.
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

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.backgroundElevated, borderColor: palette.accentTerracotta },
      ]}
    >
      <Text style={[styles.title, { color: palette.accentTerracotta }]}>
        🎬 Importar por Link (YouTube, Instagram ou Receitas Globo)
      </Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Cole o link do vídeo, Reel ou site Receitas Globo abaixo: extraímos título, foto de capa,
        ingredientes e modo de preparo automaticamente!
      </Text>
      <TextInput
        value={youtubeLink}
        onChangeText={handleLinkInput}
        placeholder="Cole: youtube.com/..., instagram.com/reel/... ou receitas.globo.com/..."
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
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14, marginBottom: 10 },
  loadingRow: { flexDirection: 'row', alignItems: 'center', gap: 8, paddingVertical: 6 },
  loadingText: { fontSize: 12, fontWeight: '700' },
  buttonsRow: { flexDirection: 'row', gap: 8 },
  secondaryBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  secondaryBtnText: { fontSize: 12, fontWeight: '700' },
  primaryBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontSize: 12, fontWeight: '800' },
});
