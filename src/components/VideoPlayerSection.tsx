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
  readonly palette: GastronomicColorPalette;
}

/**
 * Seção de vídeo híbrida: reproduz arquivos locais da galeria via player nativo
 * e apresenta player embutido (YouTube / Instagram Reel) + botão para abrir no app original.
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
    return <LocalGalleryVideoPlayer descriptor={descriptor} palette={props.palette} />;
  }
  return <ExternalSocialVideoCard descriptor={descriptor} palette={props.palette} />;
}

function LocalGalleryVideoPlayer(props: {
  readonly descriptor: RecipeVideoDescriptor;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { palette, descriptor } = props;
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <Text style={[styles.sectionHeader, { color: palette.accentTerracotta }]}>
        🎬 {formatVideoProviderLabel(descriptor.providerKind)}
      </Text>
      <Video
        source={{ uri: descriptor.rawUri }}
        useNativeControls
        resizeMode={ResizeMode.CONTAIN}
        style={styles.nativeVideo}
      />
    </View>
  );
}

function ExternalSocialVideoCard(props: {
  readonly descriptor: RecipeVideoDescriptor;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { descriptor, palette } = props;
  const canEmbedInline = Platform.OS === 'web' && descriptor.embedUri !== null;
  const [showInlinePlayer, setShowInlinePlayer] = useState<boolean>(canEmbedInline);
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
        showInlinePlayer={showInlinePlayer && canEmbedInline}
      />
      <Text style={[styles.uriText, { color: palette.textSecondary }]} numberOfLines={1}>
        {descriptor.rawUri}
      </Text>
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
  readonly showInlinePlayer: boolean;
}): React.ReactElement | null {
  const { descriptor, showInlinePlayer } = props;
  if (showInlinePlayer && descriptor.embedUri) {
    const height = resolveEmbeddedPlayerHeight(descriptor.providerKind, descriptor.rawUri);
    return React.createElement('iframe', {
      src: descriptor.embedUri,
      title: formatVideoProviderLabel(descriptor.providerKind),
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
  toggleEmbedBtn: { paddingHorizontal: 10, paddingVertical: 5, borderRadius: 8 },
  toggleEmbedText: { fontSize: 12, fontWeight: '700' },
  nativeVideo: { width: '100%', height: 210, borderRadius: 10, backgroundColor: '#000000' },
  thumbnailPreview: { width: '100%', height: 175, borderRadius: 10, marginBottom: 10 },
  uriText: { fontSize: 12, marginBottom: 10 },
  watchButton: { paddingVertical: 11, borderRadius: 10, alignItems: 'center' },
  watchButtonText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
});
