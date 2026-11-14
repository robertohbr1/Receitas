import React, { useState } from 'react';
import { StyleSheet, Text, TextInput, TouchableOpacity, View } from 'react-native';
import {
  extractEmbeddedTranscriptFromNotes,
  hasPlaceholderRecipeContent,
} from '../services/recipeTranscriptParser';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';
import { CulinaryRecipeRecord } from '../types/recipeTypes';

export interface VideoTranscriptArchiveCardProps {
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
  readonly onCopyText?: (text: string) => void;
  readonly onReconstructFromTranscript?: (transcriptText: string) => void;
}

/**
 * Card de preservação offline da transcrição falada do vídeo, garantindo acesso
 * ao conteúdo dito pelo chef mesmo se o vídeo original sair do ar.
 *
 * @example
 * <VideoTranscriptArchiveCard recipe={recipe} palette={palette} onReconstructFromTranscript={handleRebuild} />
 */
export function VideoTranscriptArchiveCard(
  props: VideoTranscriptArchiveCardProps,
): React.ReactElement | null {
  const { recipe, palette } = props;
  const transcriptText = extractEmbeddedTranscriptFromNotes(
    recipe.unifiedChefNotesAndNutrition,
    recipe.videoTranscriptText,
  );
  const [isExpanded, setIsExpanded] = useState<boolean>(false);
  const [copiedFeedback, setCopiedFeedback] = useState<boolean>(false);
  const [searchFilter, setSearchFilter] = useState<string>('');

  if (!transcriptText) {
    return null;
  }

  const isPlaceholderRecipe = hasPlaceholderRecipeContent(
    recipe.ingredients,
    recipe.preparationSteps,
  );

  const handleCopy = (): void => {
    if (!props.onCopyText) return;
    props.onCopyText(transcriptText);
    setCopiedFeedback(true);
    setTimeout(() => setCopiedFeedback(false), 2000);
  };

  return (
    <View
      style={[
        styles.card,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <TranscriptCardHeader
        palette={palette}
        isExpanded={isExpanded}
        onToggleExpand={() => setIsExpanded((prev) => !prev)}
      />
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        O que é dito no vídeo está salvo permanentemente neste aparelho. Mesmo que o vídeo saia do
        ar, você nunca perderá as quantidades e dicas faladas.
      </Text>
      {props.onReconstructFromTranscript && (
        <ReconstructRecipeBanner
          palette={palette}
          isUrgent={isPlaceholderRecipe}
          onPress={() => props.onReconstructFromTranscript!(transcriptText)}
        />
      )}
      {isExpanded && (
        <ExpandedTranscriptBody
          transcriptText={transcriptText}
          searchFilter={searchFilter}
          copiedFeedback={copiedFeedback}
          palette={palette}
          onSearchChange={setSearchFilter}
          onCopy={props.onCopyText ? handleCopy : undefined}
        />
      )}
    </View>
  );
}

function TranscriptCardHeader(props: {
  readonly palette: GastronomicColorPalette;
  readonly isExpanded: boolean;
  readonly onToggleExpand: () => void;
}): React.ReactElement {
  const { palette, isExpanded } = props;
  return (
    <View style={styles.headerRow}>
      <View style={styles.titleBadgeRow}>
        <Text style={[styles.title, { color: palette.textPrimary }]}>
          🎙️ Transcrição Falada do Vídeo
        </Text>
        <View style={[styles.shieldPill, { backgroundColor: palette.badgeBackground }]}>
          <Text style={[styles.shieldText, { color: palette.successOlive }]}>
            🛡️ Salva Offline
          </Text>
        </View>
      </View>
      <TouchableOpacity
        onPress={props.onToggleExpand}
        style={[styles.expandBtn, { backgroundColor: palette.backgroundElevated }]}
      >
        <Text style={[styles.expandBtnText, { color: palette.accentTerracotta }]}>
          {isExpanded ? '🔼 Recolher' : '📖 Ler Tudo'}
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function ReconstructRecipeBanner(props: {
  readonly palette: GastronomicColorPalette;
  readonly isUrgent: boolean;
  readonly onPress: () => void;
}): React.ReactElement {
  const { palette, isUrgent } = props;
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.reconstructBtn,
        {
          backgroundColor: isUrgent ? palette.accentTerracotta : palette.badgeBackground,
          borderColor: palette.accentTerracotta,
        },
      ]}
    >
      <Text
        style={[
          styles.reconstructBtnText,
          { color: isUrgent ? '#FFFFFF' : palette.accentTerracotta },
        ]}
      >
        🪄 Extrair Ingredientes e Passo a Passo da Transcrição
      </Text>
    </TouchableOpacity>
  );
}

function ExpandedTranscriptBody(props: {
  readonly transcriptText: string;
  readonly searchFilter: string;
  readonly copiedFeedback: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onSearchChange: (val: string) => void;
  readonly onCopy?: () => void;
}): React.ReactElement {
  const { palette, transcriptText, searchFilter } = props;
  const filteredText = filterTranscriptSentences(transcriptText, searchFilter);
  return (
    <View style={[styles.bodyBox, { backgroundColor: palette.backgroundElevated }]}>
      <View style={styles.toolbarRow}>
        <TextInput
          value={searchFilter}
          onChangeText={props.onSearchChange}
          placeholder="Buscar palavra dita no vídeo..."
          placeholderTextColor={palette.textSecondary}
          style={[
            styles.searchInput,
            {
              backgroundColor: palette.backgroundCard,
              color: palette.textPrimary,
              borderColor: palette.borderSubtle,
            },
          ]}
        />
        {props.onCopy && (
          <TouchableOpacity
            onPress={props.onCopy}
            style={[styles.copyBtn, { backgroundColor: palette.backgroundCard }]}
          >
            <Text style={[styles.copyBtnText, { color: palette.accentTerracotta }]}>
              {props.copiedFeedback ? '✅ Copiado!' : '📋 Copiar'}
            </Text>
          </TouchableOpacity>
        )}
      </View>
      <Text style={[styles.transcriptText, { color: palette.textPrimary }]}>{filteredText}</Text>
    </View>
  );
}

function filterTranscriptSentences(transcriptText: string, query: string): string {
  const trimmedQuery = query.trim().toLowerCase();
  if (!trimmedQuery) return transcriptText;
  const sentences = transcriptText
    .split(/(?<=[.!?])\s+|\n+/)
    .filter((sentence) => sentence.toLowerCase().includes(trimmedQuery));
  return sentences.length > 0
    ? sentences.join('\n• ')
    : `Nenhuma menção a "${query}" encontrada na transcrição.`;
}

const styles = StyleSheet.create({
  card: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  headerRow: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    marginBottom: 6,
    gap: 8,
  },
  titleBadgeRow: { flexDirection: 'row', alignItems: 'center', flexWrap: 'wrap', gap: 6, flex: 1 },
  title: { fontSize: 15, fontWeight: '700' },
  shieldPill: { paddingHorizontal: 8, paddingVertical: 3, borderRadius: 8 },
  shieldText: { fontSize: 11, fontWeight: '800' },
  expandBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  expandBtnText: { fontSize: 12, fontWeight: '700' },
  subtitle: { fontSize: 12, lineHeight: 17, marginBottom: 10 },
  reconstructBtn: {
    paddingVertical: 9,
    paddingHorizontal: 12,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
    marginBottom: 8,
  },
  reconstructBtnText: { fontSize: 12, fontWeight: '800' },
  bodyBox: { borderRadius: 10, padding: 12, marginTop: 4 },
  toolbarRow: { flexDirection: 'row', alignItems: 'center', gap: 8, marginBottom: 10 },
  searchInput: {
    flex: 1,
    height: 36,
    borderWidth: 1,
    borderRadius: 8,
    paddingHorizontal: 10,
    fontSize: 13,
  },
  copyBtn: { paddingHorizontal: 10, paddingVertical: 8, borderRadius: 8 },
  copyBtnText: { fontSize: 12, fontWeight: '700' },
  transcriptText: { fontSize: 14, lineHeight: 21 },
});