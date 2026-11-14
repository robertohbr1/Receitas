import React from 'react';
import {
  ActivityIndicator,
  StyleSheet,
  Text,
  TouchableOpacity,
  View,
} from 'react-native';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface ClipboardImportBannerProps {
  readonly palette: GastronomicColorPalette;
  readonly detectedUrl: string | null;
  readonly isImporting: boolean;
  readonly statusMessage: string | null;
  readonly onQuickSaveDetectedUrl: () => void;
  readonly onPasteFromClipboardNow: () => void;
  readonly onDismissBanner: () => void;
}

/**
 * Faixa de atalho rápido na tela inicial para salvar um link copiado com 1 toque.
 *
 * @example
 * <ClipboardImportBanner palette={palette} detectedUrl="https://youtu.be/abc" isImporting={false} ... />
 */
export function ClipboardImportBanner(
  props: ClipboardImportBannerProps,
): React.ReactElement {
  const { palette, detectedUrl, isImporting, statusMessage } = props;
  if (!detectedUrl) {
    return (
      <ManualClipboardShortcutRow
        palette={palette}
        isImporting={isImporting}
        statusMessage={statusMessage}
        onPasteFromClipboardNow={props.onPasteFromClipboardNow}
      />
    );
  }
  return (
    <DetectedUrlBannerCard
      palette={palette}
      detectedUrl={detectedUrl}
      isImporting={isImporting}
      statusMessage={statusMessage}
      onQuickSave={props.onQuickSaveDetectedUrl}
      onDismiss={props.onDismissBanner}
    />
  );
}

function ManualClipboardShortcutRow(props: {
  readonly palette: GastronomicColorPalette;
  readonly isImporting: boolean;
  readonly statusMessage: string | null;
  readonly onPasteFromClipboardNow: () => void;
}): React.ReactElement {
  const { palette, isImporting, statusMessage } = props;
  return (
    <View style={styles.shortcutWrapper}>
      <TouchableOpacity
        disabled={isImporting}
        onPress={props.onPasteFromClipboardNow}
        style={[
          styles.shortcutBtn,
          { backgroundColor: palette.backgroundElevated, borderColor: palette.borderSubtle },
        ]}
      >
        {isImporting ? (
          <ActivityIndicator size="small" color={palette.accentTerracotta} />
        ) : (
          <Text style={[styles.shortcutText, { color: palette.accentTerracotta }]}>
            📋 Colar Link Copiado e Salvar Receita
          </Text>
        )}
      </TouchableOpacity>
      {statusMessage && (
        <Text style={[styles.statusText, { color: palette.textSecondary }]}>{statusMessage}</Text>
      )}
    </View>
  );
}

function DetectedUrlBannerCard(props: {
  readonly palette: GastronomicColorPalette;
  readonly detectedUrl: string;
  readonly isImporting: boolean;
  readonly statusMessage: string | null;
  readonly onQuickSave: () => void;
  readonly onDismiss: () => void;
}): React.ReactElement {
  const { palette, detectedUrl, isImporting, statusMessage } = props;
  return (
    <View
      style={[
        styles.bannerCard,
        { backgroundColor: palette.backgroundElevated, borderColor: palette.accentTerracotta },
      ]}
    >
      <Text style={[styles.bannerTitle, { color: palette.accentTerracotta }]}>
        📋 Link de receita copiado detectado!
      </Text>
      <Text style={[styles.urlPreview, { color: palette.textSecondary }]} numberOfLines={1}>
        {detectedUrl}
      </Text>
      {statusMessage && (
        <Text style={[styles.statusText, { color: palette.textSecondary }]}>{statusMessage}</Text>
      )}
      <DetectedBannerButtons
        palette={palette}
        isImporting={isImporting}
        onQuickSave={props.onQuickSave}
        onDismiss={props.onDismiss}
      />
    </View>
  );
}

function DetectedBannerButtons(props: {
  readonly palette: GastronomicColorPalette;
  readonly isImporting: boolean;
  readonly onQuickSave: () => void;
  readonly onDismiss: () => void;
}): React.ReactElement {
  const { palette, isImporting } = props;
  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        disabled={isImporting}
        onPress={props.onQuickSave}
        style={[styles.saveBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.saveBtnText}>
          {isImporting ? '⏳ Salvando receita...' : '⚡ Salvar com 1 Toque'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={isImporting}
        onPress={props.onDismiss}
        style={[styles.dismissBtn, { borderColor: palette.borderSubtle }]}
      >
        <Text style={[styles.dismissText, { color: palette.textSecondary }]}>Agora não</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  shortcutWrapper: { paddingHorizontal: 16, paddingBottom: 6 },
  shortcutBtn: {
    borderWidth: 1,
    borderRadius: 10,
    paddingVertical: 9,
    paddingHorizontal: 12,
    alignItems: 'center',
  },
  shortcutText: { fontSize: 13, fontWeight: '700' },
  bannerCard: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1.5,
    borderRadius: 14,
    padding: 12,
  },
  bannerTitle: { fontSize: 13, fontWeight: '800', marginBottom: 4 },
  urlPreview: { fontSize: 12, marginBottom: 8 },
  statusText: { fontSize: 12, marginTop: 4, marginBottom: 4 },
  actionsRow: { flexDirection: 'row', gap: 8 },
  saveBtn: { flex: 1, borderRadius: 10, paddingVertical: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontSize: 13, fontWeight: '700' },
  dismissBtn: { borderWidth: 1, borderRadius: 10, paddingVertical: 10, paddingHorizontal: 12 },
  dismissText: { fontSize: 13, fontWeight: '600' },
});