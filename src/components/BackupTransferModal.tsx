import React, { useState } from 'react';
import {
  Linking,
  Modal,
  Platform,
  Share,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import * as FileSystem from 'expo-file-system';
import * as Sharing from 'expo-sharing';
import { ClipboardGateway } from '../adapters/clipboardGateway';
import { BackupDocumentPickerGateway } from '../adapters/documentPickerGateway';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface BackupTransferModalProps {
  readonly visible: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onClose: () => void;
  readonly onGenerateBackupJson: () => Promise<string>;
  readonly onRestoreBackupJson: (rawJson: string) => Promise<number>;
  readonly onGenerateBackupZipBase64?: () => Promise<string>;
  readonly onRestoreBackupZipBase64?: (zipBase64: string) => Promise<number>;
  readonly documentPickerGateway?: BackupDocumentPickerGateway;
  readonly clipboardGateway?: ClipboardGateway;
}

const BACKUP_FILENAME = 'caderno-gastronomico-backup.json';
const BACKUP_ZIP_FILENAME = 'caderno-gastronomico-backup.zip';

/**
 * Modal de Backup e Restauração com suporte a JSON, pacote ZIP com mídias locais e seletor de arquivo.
 *
 * @example
 * <BackupTransferModal visible={isOpen} palette={palette} onClose={close} ... />
 */
export function BackupTransferModal(props: BackupTransferModalProps): React.ReactElement {
  const [jsonText, setJsonText] = useState<string>('');
  const [showShareMenu, setShowShareMenu] = useState<boolean>(false);
  const [feedbackMsg, setFeedbackMsg] = useState<string | null>(null);
  const [isError, setIsError] = useState<boolean>(false);

  const handleExport = async (): Promise<void> => {
    const exported = await props.onGenerateBackupJson();
    setJsonText(exported);
    setShowShareMenu(true);
    setIsError(false);
    setFeedbackMsg(
      `✅ Arquivo "${BACKUP_FILENAME}" pronto! Escolha uma opção no menu de compartilhamento abaixo:`,
    );
    await writeAndShareBackupJsonFile(exported);
  };

  const handleExportZip = async (): Promise<void> => {
    if (!props.onGenerateBackupZipBase64) return;
    try {
      setIsError(false);
      setFeedbackMsg('⏳ Empacotando receitas, capas e vídeos offline em .ZIP...');
      const zipBase64 = await props.onGenerateBackupZipBase64();
      await writeAndShareZipFile(zipBase64);
      setFeedbackMsg(`✅ Pacote completo "${BACKUP_ZIP_FILENAME}" pronto para salvar ou enviar!`);
    } catch (err) {
      setIsError(true);
      setFeedbackMsg(err instanceof Error ? err.message : 'Falha ao gerar pacote ZIP');
    }
  };

  const handleRestore = async (): Promise<void> => {
    try {
      const total = await props.onRestoreBackupJson(jsonText);
      setIsError(false);
      setFeedbackMsg(`✅ Sucesso! Catálogo atualizado com ${total} receitas.`);
    } catch (err) {
      setIsError(true);
      setFeedbackMsg(err instanceof Error ? err.message : 'JSON de backup inválido');
    }
  };

  const handlePickBackupFile = async (): Promise<void> => {
    if (!props.documentPickerGateway) return;
    try {
      const picked = await props.documentPickerGateway.pickBackupFile();
      if (!picked) return;
      if (picked.format === 'zip' && props.onRestoreBackupZipBase64) {
        const total = await props.onRestoreBackupZipBase64(picked.zipBase64);
        setIsError(false);
        setFeedbackMsg(`✅ Pacote ZIP "${picked.filename}" restaurado (${total} receitas)!`);
        return;
      }
      if (picked.format === 'json') {
        setJsonText(picked.jsonText);
        const total = await props.onRestoreBackupJson(picked.jsonText);
        setIsError(false);
        setFeedbackMsg(`✅ Arquivo "${picked.filename}" restaurado (${total} receitas)!`);
      }
    } catch (err) {
      setIsError(true);
      setFeedbackMsg(err instanceof Error ? err.message : 'Falha ao ler arquivo de backup');
    }
  };

  return (
    <Modal visible={props.visible} animationType="slide" transparent>
      <View style={styles.backdrop}>
        <BackupDialogCard
          palette={props.palette}
          jsonText={jsonText}
          showShareMenu={showShareMenu}
          feedbackMsg={feedbackMsg}
          isError={isError}
          hasZipSupport={Boolean(props.onGenerateBackupZipBase64)}
          hasFilePicker={Boolean(props.documentPickerGateway)}
          clipboardGateway={props.clipboardGateway}
          onChangeJsonText={setJsonText}
          onExport={() => void handleExport()}
          onExportZip={() => void handleExportZip()}
          onPickBackupFile={() => void handlePickBackupFile()}
          onRestore={() => void handleRestore()}
          onFeedback={setFeedbackMsg}
          onClose={props.onClose}
        />
      </View>
    </Modal>
  );
}

async function writeAndShareBackupJsonFile(backupJson: string): Promise<void> {
  if (Platform.OS === 'web') {
    triggerBrowserFileDownloadFromText(backupJson);
    return;
  }
  await shareBackupFileOnNative(backupJson);
}

async function shareBackupFileOnNative(backupJson: string): Promise<void> {
  try {
    const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
    const fileUri = `${baseDir}${BACKUP_FILENAME}`;
    await FileSystem.writeAsStringAsync(fileUri, backupJson, {
      encoding: FileSystem.EncodingType.UTF8,
    });
    const canShare = await Sharing.isAvailableAsync();
    if (canShare) {
      await Sharing.shareAsync(fileUri, {
        mimeType: 'application/json',
        dialogTitle: 'Compartilhar Arquivo de Backup (.json)',
        UTI: 'public.json',
      });
      return;
    }
    await Share.share({ title: BACKUP_FILENAME, message: backupJson });
  } catch {
    // Usuário fechou o menu nativo
  }
}

async function writeAndShareZipFile(zipBase64: string): Promise<void> {
  if (Platform.OS === 'web') {
    triggerBrowserZipDownload(zipBase64);
    return;
  }
  const baseDir = FileSystem.cacheDirectory ?? FileSystem.documentDirectory ?? '';
  const fileUri = `${baseDir}${BACKUP_ZIP_FILENAME}`;
  await FileSystem.writeAsStringAsync(fileUri, zipBase64, {
    encoding: FileSystem.EncodingType.Base64,
  });
  if (await Sharing.isAvailableAsync()) {
    await Sharing.shareAsync(fileUri, {
      mimeType: 'application/zip',
      dialogTitle: 'Compartilhar Backup Completo (.zip)',
    });
  }
}

function triggerBrowserZipDownload(zipBase64: string): void {
  if (typeof document === 'undefined' || typeof Blob === 'undefined' || typeof atob !== 'function') {
    return;
  }
  const binary = atob(zipBase64);
  const bytes = new Uint8Array(binary.length);
  for (let i = 0; i < binary.length; i++) {
    bytes[i] = binary.charCodeAt(i);
  }
  const blob = new Blob([bytes], { type: 'application/zip' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = BACKUP_ZIP_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

function triggerBrowserFileDownloadFromText(backupJson: string): void {
  if (typeof document === 'undefined' || typeof Blob === 'undefined') return;
  const blob = new Blob([backupJson], { type: 'application/json' });
  const objectUrl = URL.createObjectURL(blob);
  const anchor = document.createElement('a');
  anchor.href = objectUrl;
  anchor.download = BACKUP_FILENAME;
  document.body.appendChild(anchor);
  anchor.click();
  document.body.removeChild(anchor);
  URL.revokeObjectURL(objectUrl);
}

function BackupDialogCard(props: {
  readonly palette: GastronomicColorPalette;
  readonly jsonText: string;
  readonly showShareMenu: boolean;
  readonly feedbackMsg: string | null;
  readonly isError: boolean;
  readonly hasZipSupport: boolean;
  readonly hasFilePicker: boolean;
  readonly clipboardGateway?: ClipboardGateway;
  readonly onChangeJsonText: (v: string) => void;
  readonly onExport: () => void;
  readonly onExportZip: () => void;
  readonly onPickBackupFile: () => void;
  readonly onRestore: () => void;
  readonly onFeedback: (msg: string) => void;
  readonly onClose: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={[styles.card, { backgroundColor: palette.backgroundCard }]}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>
        🔄 Backup e Troca de Aparelho
      </Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Exporte um pacote .ZIP (com fotos e vídeos locais) ou .JSON, ou escolha um arquivo do
        aparelho para restaurar sem precisar colar texto.
      </Text>
      <BackupTopActionButtons
        palette={palette}
        onExport={props.onExport}
        onRestore={props.onRestore}
        canRestore={props.jsonText.trim().length > 0}
      />
      {(props.hasZipSupport || props.hasFilePicker) && (
        <ZipAndFilePickerRow
          palette={palette}
          hasZipSupport={props.hasZipSupport}
          hasFilePicker={props.hasFilePicker}
          onExportZip={props.onExportZip}
          onPickBackupFile={props.onPickBackupFile}
        />
      )}
      {props.showShareMenu && props.jsonText.trim().length > 0 && (
        <InlineShareOptionsMenu
          palette={palette}
          jsonText={props.jsonText}
          clipboardGateway={props.clipboardGateway}
          onFeedback={props.onFeedback}
        />
      )}
      <TextInput
        multiline
        value={props.jsonText}
        onChangeText={props.onChangeJsonText}
        placeholder="Toque em 'Gerar e Compartilhar .JSON' ou cole aqui o conteúdo do arquivo de backup..."
        placeholderTextColor={palette.textSecondary}
        style={[
          styles.jsonBox,
          {
            backgroundColor: palette.backgroundPrimary,
            color: palette.textPrimary,
            borderColor: palette.borderSubtle,
          },
        ]}
      />
      {props.feedbackMsg && (
        <Text
          style={[
            styles.feedbackText,
            { color: props.isError ? palette.dangerCrimson : palette.successOlive },
          ]}
        >
          {props.feedbackMsg}
        </Text>
      )}
      <TouchableOpacity
        onPress={props.onClose}
        style={[styles.closeBtn, { borderColor: palette.borderSubtle }]}
      >
        <Text style={[styles.closeBtnText, { color: palette.textSecondary }]}>Fechar</Text>
      </TouchableOpacity>
    </View>
  );
}

function InlineShareOptionsMenu(props: {
  readonly palette: GastronomicColorPalette;
  readonly jsonText: string;
  readonly clipboardGateway?: ClipboardGateway;
  readonly onFeedback: (msg: string) => void;
}): React.ReactElement {
  const { palette, jsonText, onFeedback } = props;
  const copyJson = async (): Promise<void> => {
    if (props.clipboardGateway) {
      await props.clipboardGateway.writeClipboardText(jsonText);
      onFeedback('📋 JSON copiado para a Área de Transferência!');
      return;
    }
    if (typeof navigator !== 'undefined' && navigator.clipboard) {
      await navigator.clipboard.writeText(jsonText);
      onFeedback('📋 JSON copiado para a Área de Transferência!');
    }
  };
  return (
    <View
      style={[
        styles.shareMenuBox,
        { backgroundColor: palette.backgroundElevated, borderColor: palette.accentTerracotta },
      ]}
    >
      <Text style={[styles.shareMenuTitle, { color: palette.accentTerracotta }]}>
        📲 Menu de Compartilhamento ({BACKUP_FILENAME}):
      </Text>
      <ShareMenuButtonsRow
        palette={palette}
        jsonText={jsonText}
        onCopy={() => void copyJson()}
        onDownload={() => {
          triggerBrowserFileDownloadFromText(jsonText);
          onFeedback(`💾 Download de "${BACKUP_FILENAME}" iniciado!`);
        }}
      />
    </View>
  );
}

function ShareMenuButtonsRow(props: {
  readonly palette: GastronomicColorPalette;
  readonly jsonText: string;
  readonly onCopy: () => void;
  readonly onDownload: () => void;
}): React.ReactElement {
  const { palette, jsonText } = props;
  const shareWhatsApp = (): void => {
    const text = `Backup Caderno Gastronômico:\n${jsonText}`;
    void Linking.openURL(`https://api.whatsapp.com/send?text=${encodeURIComponent(text)}`);
  };
  const shareEmail = (): void => {
    const subject = encodeURIComponent('Backup Caderno Gastronômico (.json)');
    const body = encodeURIComponent(jsonText);
    void Linking.openURL(`mailto:?subject=${subject}&body=${body}`);
  };
  return (
    <View style={styles.shareRow}>
      <ShareChip label="💾 Baixar .JSON" palette={palette} onPress={props.onDownload} />
      <ShareChip label="📋 Copiar JSON" palette={palette} onPress={props.onCopy} />
      <ShareChip label="🟢 WhatsApp" palette={palette} onPress={shareWhatsApp} />
      <ShareChip label="✉️ E-mail" palette={palette} onPress={shareEmail} />
      {Platform.OS !== 'web' && (
        <ShareChip
          label="📤 Outros Apps"
          palette={palette}
          onPress={() => void shareBackupFileOnNative(jsonText)}
        />
      )}
    </View>
  );
}

function ShareChip(props: {
  readonly label: string;
  readonly palette: GastronomicColorPalette;
  readonly onPress: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.shareChip,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <Text style={[styles.shareChipText, { color: palette.textPrimary }]}>{props.label}</Text>
    </TouchableOpacity>
  );
}

function ZipAndFilePickerRow(props: {
  readonly palette: GastronomicColorPalette;
  readonly hasZipSupport: boolean;
  readonly hasFilePicker: boolean;
  readonly onExportZip: () => void;
  readonly onPickBackupFile: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.actionsRow}>
      {props.hasZipSupport && (
        <TouchableOpacity
          onPress={props.onExportZip}
          style={[
            styles.secondaryBtn,
            { backgroundColor: palette.backgroundElevated, borderColor: palette.borderSubtle },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: palette.textPrimary }]}>
            📦 Exportar .ZIP (com Mídias)
          </Text>
        </TouchableOpacity>
      )}
      {props.hasFilePicker && (
        <TouchableOpacity
          onPress={props.onPickBackupFile}
          style={[
            styles.secondaryBtn,
            { backgroundColor: palette.backgroundElevated, borderColor: palette.accentTerracotta },
          ]}
        >
          <Text style={[styles.secondaryBtnText, { color: palette.accentTerracotta }]}>
            📂 Escolher Arquivo
          </Text>
        </TouchableOpacity>
      )}
    </View>
  );
}

function BackupTopActionButtons(props: {
  readonly palette: GastronomicColorPalette;
  readonly onExport: () => void;
  readonly onRestore: () => void;
  readonly canRestore: boolean;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.actionsRow}>
      <TouchableOpacity
        onPress={props.onExport}
        style={[styles.primaryBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.primaryBtnText}>📤 Gerar e Compartilhar .JSON</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={!props.canRestore}
        onPress={props.onRestore}
        style={[
          styles.secondaryBtn,
          { backgroundColor: palette.backgroundElevated, borderColor: palette.accentTerracotta },
        ]}
      >
        <Text style={[styles.secondaryBtnText, { color: palette.accentTerracotta }]}>
          📥 Restaurar JSON
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: { flex: 1, backgroundColor: 'rgba(0,0,0,0.6)', justifyContent: 'center', padding: 18 },
  card: { borderRadius: 16, padding: 18 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 18, marginBottom: 12 },
  actionsRow: { flexDirection: 'row', gap: 10, marginBottom: 12 },
  primaryBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  primaryBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 12 },
  secondaryBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  secondaryBtnText: { fontWeight: '700', fontSize: 12 },
  shareMenuBox: { borderWidth: 1.5, borderRadius: 12, padding: 12, marginBottom: 12 },
  shareMenuTitle: { fontSize: 13, fontWeight: '800', marginBottom: 8 },
  shareRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 8 },
  shareChip: { paddingVertical: 8, paddingHorizontal: 12, borderRadius: 8, borderWidth: 1 },
  shareChipText: { fontSize: 12, fontWeight: '700' },
  jsonBox: { height: 135, borderWidth: 1, borderRadius: 10, padding: 10, textAlignVertical: 'top', fontSize: 12 },
  feedbackText: { fontSize: 12, fontWeight: '700', marginTop: 8 },
  closeBtn: { marginTop: 12, paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  closeBtnText: { fontWeight: '600', fontSize: 14 },
});