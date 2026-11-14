import React, { useState } from 'react';
import {
  Image,
  Linking,
  Platform,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { ResizeMode, Video } from 'expo-av';
import {
  classifyRecipeVideoUri,
  formatVideoProviderLabel,
  resolveEmbeddedPlayerHeight,
} from '../services/videoUrlClassifier';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';
import { RecipeVideoDescriptor } from '../types/recipeTypes';

export interface VideoPlayerSectionProps {
  readonly videoSourceUri: string;
  readonly originalSourceUrl?: string;
  readonly offlineVideoStreamUrl?: string;
  readonly isDownloadingOfflineVideo?: boolean;
  readonly onDownloadOfflineVideo?: () => void;
  readonly palette: GastronomicColorPalette;
}

/**
 * Seção de vídeo híbrida: reproduz arquivos locais da galeria via player nativo,
 * permite baixar stream MP4 para uso offline e exibe fallback seguro quando offline.
 *
 * @example
 * <VideoPlayerSection videoSourceUri="https://youtu.be/2Hj2h1rR2vY" palette={palette} />
 */
export function VideoPlayerSection(props: VideoPlayerSectionProps): React.ReactElement | null {
  const descriptor = classifyRecipeVideoUri(props.videoSourceUri);
  if (descriptor.providerKind === 'none') {
    return null;
  }
  if (descriptor.providerKind === 'gallery_file') {
    return (
      <LocalGalleryVideoPlayer
        descriptor={descriptor}
        originalSourceUrl={props.originalSourceUrl}
        palette={props.palette}
      />
    );
  }
  return (
    <ExternalSocialVideoCard
      descriptor={descriptor}
      offlineVideoStreamUrl={props.offlineVideoStreamUrl}
      isDownloadingOfflineVideo={props.isDownloadingOfflineVideo}
      onDownloadOfflineVideo={props.onDownloadOfflineVideo}
      palette={props.palette}
    />
  );
}

function LocalGalleryVideoPlayer(props: {
  readonly descriptor: RecipeVideoDescriptor;
  readonly originalSourceUrl?: string;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { palette, descriptor, originalSourceUrl } = props;
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <View style={styles.headerRow}>
        <Text style={[styles.sectionHeader, { color: palette.accentTerracotta }]}>
          🎬 {formatVideoProviderLabel(descriptor.providerKind)}
        </Text>
        <View style={[styles.offlinePill, { backgroundColor: palette.badgeBackground }]}>
          <Text style={[styles.offlinePillText, { color: palette.successOlive }]}>
            ✅ Salvo no aparelho
          </Text>
        </View>
      </View>
      <Video
        source={{ uri: descriptor.rawUri }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        style={styles.nativeVideo}
      />
      {originalSourceUrl && (
        <TouchableOpacity
          onPress={() => void Linking.openURL(originalSourceUrl)}
          style={[styles.secondaryOutlineBtn, { borderColor: palette.borderSubtle }]}
        >
          <Text style={[styles.secondaryOutlineText, { color: palette.textSecondary }]}>
            ↗️ Abrir publicação original
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function ExternalSocialVideoCard(props: {
  readonly descriptor: RecipeVideoDescriptor;
  readonly offlineVideoStreamUrl?: string;
  readonly isDownloadingOfflineVideo?: boolean;
  readonly onDownloadOfflineVideo?: () => void;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { descriptor, palette } = props;
  const canEmbedInline = Platform.OS === 'web' && descriptor.embedUri !== null;
  const [showInlinePlayer, setShowInlinePlayer] = useState<boolean>(canEmbedInline);
  const [embedUnavailable, setEmbedUnavailable] = useState<boolean>(false);
  const openExternalVideo = (): void => {
    void Linking.openURL(descriptor.rawUri);
  };
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <SocialVideoHeaderRow
        descriptor={descriptor}
        palette={palette}
        canEmbedInline={canEmbedInline}
        showInlinePlayer={showInlinePlayer}
        onToggleInline={() => setShowInlinePlayer((prev) => !prev)}
      />
      <SocialVideoVisualBody
        descriptor={descriptor}
        palette={palette}
        showInlinePlayer={showInlinePlayer && canEmbedInline && !embedUnavailable}
        embedUnavailable={embedUnavailable}
        onEmbedError={() => setEmbedUnavailable(true)}
      />
      <Text style={[styles.offlineHintText, { color: palette.textSecondary }]}>
        💾 Modo arquivo offline garantido: capa, ingredientes, preparo e transcrição ficam salvos no aparelho mesmo se o vídeo sair do ar.
      </Text>
      <Text style={[styles.uriText, { color: palette.textSecondary }]} numberOfLines={1}>
        {descriptor.rawUri}
      </Text>
      {props.offlineVideoStreamUrl && props.onDownloadOfflineVideo && Platform.OS !== 'web' && (
        <TouchableOpacity
          disabled={props.isDownloadingOfflineVideo}
          onPress={props.onDownloadOfflineVideo}
          style={[styles.downloadOfflineBtn, { borderColor: palette.accentTerracotta }]}
        >
          <Text style={[styles.downloadOfflineText, { color: palette.accentTerracotta }]}>
            {props.isDownloadingOfflineVideo
              ? '⏳ Baixando vídeo para offline...'
              : '⬇️ Baixar Vídeo MP4 para Offline'}
          </Text>
        </TouchableOpacity>
      )}
      <TouchableOpacity
        onPress={openExternalVideo}
        style={[styles.watchButton, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.watchButtonText}>
          ↗️ Abrir no {formatVideoProviderLabel(descriptor.providerKind)}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function SocialVideoHeaderRow(props: {
  readonly descriptor: RecipeVideoDescriptor;
  readonly palette: GastronomicColorPalette;
  readonly canEmbedInline: boolean;
  readonly showInlinePlayer: boolean;
  readonly onToggleInline: () => void;
}): React.ReactElement {
  const { descriptor, palette } = props;
  return (
    <View style={styles.headerRow}>
      <Text style={[styles.sectionHeader, { color: palette.accentTerracotta }]}>
        🎬 {formatVideoProviderLabel(descriptor.providerKind)}
      </Text>
      {props.canEmbedInline && (
        <TouchableOpacity
          onPress={props.onToggleInline}
          style={[styles.toggleEmbedBtn, { backgroundColor: palette.badgeBackground }]}
        >
          <Text style={[styles.toggleEmbedText, { color: palette.accentTerracotta }]}>
            {props.showInlinePlayer ? '🖼️ Ver Capa' : '▶️ Player na Tela'}
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function SocialVideoVisualBody(props: {
  readonly descriptor: RecipeVideoDescriptor;
  readonly palette: GastronomicColorPalette;
  readonly showInlinePlayer: boolean;
  readonly embedUnavailable: boolean;
  readonly onEmbedError: () => void;
}): React.ReactElement | null {
  const { descriptor, showInlinePlayer, palette } = props;
  if (showInlinePlayer && descriptor.embedUri) {
    const height = resolveEmbeddedPlayerHeight(descriptor.providerKind, descriptor.rawUri);
    return React.createElement('iframe', {
      src: descriptor.embedUri,
      title: formatVideoProviderLabel(descriptor.providerKind),
      onError: props.onEmbedError,
      allow: 'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture',
      allowFullScreen: true,
      style: {
        width: '100%',
        height: `${height}px`,
        border: 'none',
        borderRadius: '10px',
        marginBottom: '10px',
        backgroundColor: '#000000',
      },
    });
  }
  if (props.embedUnavailable) {
    return (
      <View style={[styles.offlineNoticeBox, { backgroundColor: palette.backgroundElevated }]}>
        <Text style={[styles.offlineNoticeText, { color: palette.textSecondary }]}>
          ⚠️ Player externo indisponível ou sem conexão. Use os ingredientes e passos salvos abaixo.
        </Text>
      </View>
    );
  }
  if (descriptor.thumbnailUri) {
    return (
      <Image
        source={{ uri: descriptor.thumbnailUri }}
        style={styles.thumbnailPreview}
        resizeMode="cover"
      />
    );
  }
  return null;
}

const styles = StyleSheet.create({
  container: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  headerRow: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', marginBottom: 10 },
  sectionHeader: { fontSize: 14, fontWeight: '700' },
  offlinePill: { paddingHorizontal: 8, paddingVertical: 4, borderRadius: 8 },
  offlinePillText: { fontSize: 11, fontWeight: '800' },
  toggleEmbedBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  toggleEmbedText: { fontSize: 12, fontWeight: '700' },
  nativeVideo: { width: '100%', height: 210, borderRadius: 10, backgroundColor: '#000000' },
  thumbnailPreview: { width: '100%', height: 175, borderRadius: 10, marginBottom: 10 },
  offlineNoticeBox: { borderRadius: 10, padding: 10, marginBottom: 10 },
  offlineNoticeText: { fontSize: 12, lineHeight: 17 },
  offlineHintText: { fontSize: 11, lineHeight: 16, marginBottom: 6 },
  uriText: { fontSize: 12, marginBottom: 10 },
  secondaryOutlineBtn: { marginTop: 10, paddingVertical: 9, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  secondaryOutlineText: { fontSize: 12, fontWeight: '700' },
  downloadOfflineBtn: { paddingVertical: 10, borderRadius: 10, borderWidth: 1.5, alignItems: 'center', marginBottom: 8 },
  downloadOfflineText: { fontSize: 13, fontWeight: '800' },
  watchButton: { paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  watchButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});