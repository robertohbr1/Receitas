import React, { useEffect, useState } from 'react';
import {
  Modal,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { AiTranscriptionApiKeysConfig } from '../repositories/aiSettingsRepository';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';

export interface AiApiKeySettingsModalProps {
  readonly visible: boolean;
  readonly isInitialPrompt: boolean;
  readonly currentKeys: AiTranscriptionApiKeysConfig;
  readonly palette: GastronomicColorPalette;
  readonly onSaveKeys: (keys: AiTranscriptionApiKeysConfig) => Promise<void>;
  readonly onContinueWithoutKeys: () => void;
}

/**
 * Modal de configuração das API Keys do Gemini 2.5 e Groq Whisper (exibido na entrada se ausentes ou pelo menu Configurações).
 *
 * @example
 * <AiApiKeySettingsModal visible={true} isInitialPrompt={false} currentKeys={keys} ... />
 */
export function AiApiKeySettingsModal(
  props: AiApiKeySettingsModalProps,
): React.ReactElement {
  const { palette } = props;
  const state = useApiKeyModalState(props);
  return (
    <Modal visible={props.visible} animationType="fade" transparent>
      <View style={styles.backdrop}>
        <View style={[styles.sheet, { backgroundColor: palette.backgroundCard }]}>
          <ModalHeaderSection palette={palette} isInitialPrompt={props.isInitialPrompt} />
          <ApiKeyInputFields
            palette={palette}
            geminiKey={state.geminiKey}
            groqKey={state.groqKey}
            onChangeGeminiKey={state.setGeminiKey}
            onChangeGroqKey={state.setGroqKey}
          />
          {state.statusFeedback !== '' && (
            <Text style={[styles.feedbackText, { color: palette.successOlive }]}>
              {state.statusFeedback}
            </Text>
          )}
          <ModalActionButtons
            palette={palette}
            isInitialPrompt={props.isInitialPrompt}
            onSave={() => void state.handleSave()}
            onCloseOrSkip={props.onContinueWithoutKeys}
          />
        </View>
      </View>
    </Modal>
  );
}

interface ApiKeyModalInternalState {
  readonly geminiKey: string;
  readonly groqKey: string;
  readonly statusFeedback: string;
  readonly setGeminiKey: (val: string) => void;
  readonly setGroqKey: (val: string) => void;
  readonly handleSave: () => Promise<void>;
}

function useApiKeyModalState(props: AiApiKeySettingsModalProps): ApiKeyModalInternalState {
  const [geminiKey, setGeminiKey] = useState<string>(props.currentKeys.geminiApiKey);
  const [groqKey, setGroqKey] = useState<string>(props.currentKeys.groqWhisperApiKey);
  const [statusFeedback, setStatusFeedback] = useState<string>('');
  useEffect(() => {
    setGeminiKey(props.currentKeys.geminiApiKey);
    setGroqKey(props.currentKeys.groqWhisperApiKey);
    setStatusFeedback('');
  }, [props.currentKeys.geminiApiKey, props.currentKeys.groqWhisperApiKey, props.visible]);
  const handleSave = async (): Promise<void> => {
    await props.onSaveKeys({ geminiApiKey: geminiKey.trim(), groqWhisperApiKey: groqKey.trim() });
    setStatusFeedback('✅ Configurações salvas com sucesso!');
  };
  return { geminiKey, groqKey, statusFeedback, setGeminiKey, setGroqKey, handleSave };
}

function ModalHeaderSection(props: {
  readonly palette: GastronomicColorPalette;
  readonly isInitialPrompt: boolean;
}): React.ReactElement {
  const { palette, isInitialPrompt } = props;
  const title = isInitialPrompt
    ? '🎙️ Chaves de IA para Transcrição (Opcional)'
    : '⚙️ Configurações de IA (Transcrição de Vídeos)';
  const subtitle = isInitialPrompt
    ? 'Informe abaixo sua API Key do Gemini 2.5 e/ou do Groq Whisper para transcrever o áudio de Reels do Instagram. Você também pode continuar sem informar e configurar depois.'
    : 'Cadastre ou atualize suas chaves de API do Google Gemini 2.5 e do Groq Whisper para transcrição automática de vídeos.';
  return (
    <View style={styles.headerBlock}>
      <Text style={[styles.title, { color: palette.textPrimary }]}>{title}</Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>{subtitle}</Text>
    </View>
  );
}

function ApiKeyInputFields(props: {
  readonly palette: GastronomicColorPalette;
  readonly geminiKey: string;
  readonly groqKey: string;
  readonly onChangeGeminiKey: (val: string) => void;
  readonly onChangeGroqKey: (val: string) => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.fieldsContainer}>
      <SingleKeyField
        palette={palette}
        label="✨ API Key do Google Gemini 2.5 (gemini-2.5-flash)"
        placeholder="Ex: AIzaSy..."
        value={props.geminiKey}
        onChangeText={props.onChangeGeminiKey}
      />
      <SingleKeyField
        palette={palette}
        label="⚡ API Key do Groq Whisper (whisper-large-v3-turbo)"
        placeholder="Ex: gsk_..."
        value={props.groqKey}
        onChangeText={props.onChangeGroqKey}
      />
    </View>
  );
}

function SingleKeyField(props: {
  readonly palette: GastronomicColorPalette;
  readonly label: string;
  readonly placeholder: string;
  readonly value: string;
  readonly onChangeText: (val: string) => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.singleFieldBox}>
      <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        onChangeText={props.onChangeText}
        placeholder={props.placeholder}
        placeholderTextColor={palette.textSecondary}
        autoCapitalize="none"
        autoCorrect={false}
        style={[
          styles.keyInput,
          {
            backgroundColor: palette.backgroundPrimary,
            color: palette.textPrimary,
            borderColor: palette.borderSubtle,
          },
        ]}
      />
    </View>
  );
}

function ModalActionButtons(props: {
  readonly palette: GastronomicColorPalette;
  readonly isInitialPrompt: boolean;
  readonly onSave: () => void;
  readonly onCloseOrSkip: () => void;
}): React.ReactElement {
  const { palette, isInitialPrompt } = props;
  const skipLabel = isInitialPrompt
    ? 'Continuar sem API Key (Configurar depois)'
    : 'Fechar';
  return (
    <View style={styles.actionsColumn}>
      <TouchableOpacity
        onPress={props.onSave}
        style={[styles.saveBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.saveBtnText}>💾 Salvar API Keys</Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={props.onCloseOrSkip}
        style={[styles.skipBtn, { borderColor: palette.borderSubtle }]}
      >
        <Text style={[styles.skipBtnText, { color: palette.textSecondary }]}>
          {skipLabel}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  backdrop: {
    flex: 1,
    backgroundColor: 'rgba(20, 12, 8, 0.65)',
    justifyContent: 'center',
    padding: 18,
  },
  sheet: { borderRadius: 18, padding: 20 },
  headerBlock: { marginBottom: 14 },
  title: { fontSize: 18, fontWeight: '800', marginBottom: 6 },
  subtitle: { fontSize: 13, lineHeight: 19 },
  fieldsContainer: { gap: 12, marginBottom: 14 },
  singleFieldBox: { gap: 5 },
  fieldLabel: { fontSize: 13, fontWeight: '700' },
  keyInput: {
    borderWidth: 1,
    borderRadius: 10,
    paddingHorizontal: 12,
    paddingVertical: 10,
    fontSize: 13,
  },
  feedbackText: { fontSize: 13, fontWeight: '700', marginBottom: 10 },
  actionsColumn: { gap: 8 },
  saveBtn: { paddingVertical: 12, borderRadius: 10, alignItems: 'center' },
  saveBtnText: { color: '#FFFFFF', fontWeight: '700', fontSize: 14 },
  skipBtn: { paddingVertical: 10, borderRadius: 10, borderWidth: 1, alignItems: 'center' },
  skipBtnText: { fontWeight: '600', fontSize: 13 },
});