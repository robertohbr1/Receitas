import React from 'react';
import { Image, ScrollView, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { ClipboardGateway } from '../adapters/clipboardGateway';
import { RecipeExportGateway } from '../adapters/recipeShareGateway';
import { CookingStepsWithTimerSection } from '../components/CookingStepsWithTimerSection';
import { FloatingCookingTimerBar } from '../components/FloatingCookingTimerBar';
import { IngredientChecklistSection } from '../components/IngredientChecklistSection';
import { VideoPlayerSection } from '../components/VideoPlayerSection';
import { VideoTranscriptArchiveCard } from '../components/VideoTranscriptArchiveCard';
import { useCookingSessionController } from '../hooks/useCookingSessionController';
import { GastronomicColorPalette, resolveCategoryIcon } from '../theme/gastronomicTheme';
import { CulinaryRecipeRecord } from '../types/recipeTypes';

export interface RecipeDetailScreenProps {
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
  readonly exportGateway: RecipeExportGateway;
  readonly clipboardGateway?: ClipboardGateway;
  readonly onBackToCatalog: () => void;
  readonly onEditRecipe: (recipe: CulinaryRecipeRecord) => void;
  readonly onDeleteRecipe: (recipeId: string) => void;
  readonly onToggleFavorite: (recipeId: string) => void;
  readonly onSaveOfflineVideo?: (recipeId: string) => Promise<void>;
  readonly onReconstructFromTranscript?: (recipeId: string, transcriptText: string) => Promise<void>;
}

/**
 * Tela de visualização completa e Modo Cozinha com vídeo, transcrição offline,
 * checklist de ingredientes (Mise en Place), passo a passo enriquecido, timer e exportação.
 *
 * @example
 * <RecipeDetailScreen recipe={selected} palette={palette} exportGateway={gateway} ... />
 */
export function RecipeDetailScreen(props: RecipeDetailScreenProps): React.ReactElement {
  const [isDownloadingVideo, setIsDownloadingVideo] = React.useState<boolean>(false);
  const [downloadError, setDownloadError] = React.useState<string | null>(null);
  const [isTextOnlyReadingMode, setIsTextOnlyReadingMode] = React.useState<boolean>(false);
  const session = useCookingSessionController(
    props.recipe.preparationMinutes,
    props.recipe.servingsCount,
  );
  const handleOfflineVideoDownload = async (): Promise<void> => {
    if (!props.onSaveOfflineVideo) return;
    setIsDownloadingVideo(true);
    setDownloadError(null);
    try {
      await props.onSaveOfflineVideo(props.recipe.id);
    } catch (err) {
      setDownloadError(err instanceof Error ? err.message : 'Falha ao baixar vídeo offline');
    } finally {
      setIsDownloadingVideo(false);
    }
  };
  return (
    <View style={[styles.screen, { backgroundColor: props.palette.backgroundPrimary }]}>
      <DetailTopNavigationBar
        recipe={props.recipe}
        palette={props.palette}
        onBack={props.onBackToCatalog}
        onEdit={() => props.onEditRecipe(props.recipe)}
        onDelete={() => props.onDeleteRecipe(props.recipe.id)}
        onToggleFavorite={() => props.onToggleFavorite(props.recipe.id)}
      />
      <DetailScrollableBody
        recipe={props.recipe}
        palette={props.palette}
        exportGateway={props.exportGateway}
        clipboardGateway={props.clipboardGateway}
        session={session}
        isDownloadingVideo={isDownloadingVideo}
        downloadError={downloadError}
        isTextOnlyReadingMode={isTextOnlyReadingMode}
        onToggleTextOnlyMode={() => setIsTextOnlyReadingMode((prev) => !prev)}
        onSaveOfflineVideo={
          props.onSaveOfflineVideo ? () => void handleOfflineVideoDownload() : undefined
        }
        onReconstructFromTranscript={
          props.onReconstructFromTranscript
            ? (text) => void props.onReconstructFromTranscript!(props.recipe.id, text)
            : undefined
        }
      />
    </View>
  );
}

function DetailScrollableBody(props: {
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
  readonly exportGateway: RecipeExportGateway;
  readonly clipboardGateway?: ClipboardGateway;
  readonly session: ReturnType<typeof useCookingSessionController>;
  readonly isDownloadingVideo: boolean;
  readonly downloadError: string | null;
  readonly isTextOnlyReadingMode: boolean;
  readonly onToggleTextOnlyMode: () => void;
  readonly onSaveOfflineVideo?: () => void;
  readonly onReconstructFromTranscript?: (transcriptText: string) => void;
}): React.ReactElement {
  const { recipe, palette, session } = props;
  const copyTextHelper = props.clipboardGateway
    ? (text: string) => void props.clipboardGateway!.writeClipboardText(text)
    : undefined;
  return (
    <ScrollView contentContainerStyle={styles.scrollContent}>
      <DetailHeroSummary recipe={recipe} palette={palette} />
      <ShareActionsRow
        recipe={recipe}
        palette={palette}
        exportGateway={props.exportGateway}
        isTextOnlyReadingMode={props.isTextOnlyReadingMode}
        onToggleTextOnlyMode={props.onToggleTextOnlyMode}
      />
      <FloatingCookingTimerBar
        timerSnapshot={session.timerState}
        palette={palette}
        onTogglePlayPause={session.toggleTimerPlayPause}
        onResetTimer={session.resetTimer}
        onAddOneMinute={session.addOneMinuteToTimer}
        onSelectPresetMinutes={(mins) => session.startCustomTimer(mins * 60, `Timer ${mins} min`)}
      />
      {props.downloadError && (
        <Text style={{ color: palette.dangerCrimson, fontSize: 12, marginBottom: 8 }}>
          {props.downloadError}
        </Text>
      )}
      {!props.isTextOnlyReadingMode && (
        <VideoPlayerSection
          videoSourceUri={recipe.videoSourceUri}
          originalSourceUrl={recipe.originalSourceUrl}
          offlineVideoStreamUrl={recipe.offlineVideoStreamUrl}
          isDownloadingOfflineVideo={props.isDownloadingVideo}
          onDownloadOfflineVideo={props.onSaveOfflineVideo}
          palette={palette}
        />
      )}
      <IngredientChecklistSection
        ingredients={recipe.ingredients}
        checkedIndices={session.checkedIngredients}
        palette={palette}
        baseServings={recipe.servingsCount}
        targetServings={session.targetServings}
        recipeTitle={recipe.title}
        onAdjustServings={session.adjustTargetServings}
        onToggleIngredientIndex={session.toggleIngredient}
        onCopyShoppingList={copyTextHelper}
      />
      <CookingStepsWithTimerSection
        steps={recipe.preparationSteps}
        ingredients={recipe.ingredients}
        baseServings={recipe.servingsCount}
        targetServings={session.targetServings}
        completedSteps={session.completedSteps}
        palette={palette}
        onToggleStepCompleted={session.toggleStep}
        onStartStepTimer={session.startCustomTimer}
      />
      <VideoTranscriptArchiveCard
        recipe={recipe}
        palette={palette}
        onCopyText={copyTextHelper}
        onReconstructFromTranscript={props.onReconstructFromTranscript}
      />
      <UnifiedChefNotesSection recipe={recipe} palette={palette} />
    </ScrollView>
  );
}

function DetailTopNavigationBar(props: {
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
  readonly onBack: () => void;
  readonly onEdit: () => void;
  readonly onDelete: () => void;
  readonly onToggleFavorite: () => void;
}): React.ReactElement {
  const { palette, recipe } = props;
  return (
    <View style={[styles.topNav, { borderColor: palette.borderSubtle }]}>
      <TouchableOpacity onPress={props.onBack} style={styles.backBtn}>
        <Text style={[styles.backBtnText, { color: palette.accentTerracotta }]}>← Voltar</Text>
      </TouchableOpacity>
      <View style={styles.navActions}>
        <TouchableOpacity onPress={props.onToggleFavorite} style={styles.iconBtn}>
          <Text style={styles.iconText}>{recipe.isFavorite ? '❤️' : '🤍'}</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={props.onEdit}
          style={[styles.actionBtn, { backgroundColor: palette.backgroundElevated }]}
        >
          <Text style={[styles.actionBtnText, { color: palette.textPrimary }]}>✏️ Editar</Text>
        </TouchableOpacity>
        <TouchableOpacity
          onPress={props.onDelete}
          style={[styles.actionBtn, { backgroundColor: palette.badgeBackground }]}
        >
          <Text style={[styles.actionBtnText, { color: palette.dangerCrimson }]}>🗑️ Excluir</Text>
        </TouchableOpacity>
      </View>
    </View>
  );
}

function DetailHeroSummary(props: {
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { recipe, palette } = props;
  return (
    <View style={styles.heroBox}>
      {recipe.coverImageUri ? (
        <Image source={{ uri: recipe.coverImageUri }} style={styles.heroImage} resizeMode="cover" />
      ) : null}
      <Text style={[styles.categoryLabel, { color: palette.accentTerracotta }]}>
        {resolveCategoryIcon(recipe.category)} {recipe.category} • Dificuldade {recipe.difficulty}
      </Text>
      <Text style={[styles.recipeTitle, { color: palette.textPrimary }]}>{recipe.title}</Text>
      <Text style={[styles.metaStats, { color: palette.textSecondary }]}>
        ⏱️ Preparo: {recipe.preparationMinutes} min • 🥘 Rendimento: {recipe.servingsCount} porções
      </Text>
    </View>
  );
}

function ShareActionsRow(props: {
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
  readonly exportGateway: RecipeExportGateway;
  readonly isTextOnlyReadingMode: boolean;
  readonly onToggleTextOnlyMode: () => void;
}): React.ReactElement {
  const { recipe, palette, exportGateway, isTextOnlyReadingMode } = props;
  return (
    <View style={styles.shareRow}>
      <TouchableOpacity
        onPress={props.onToggleTextOnlyMode}
        style={[
          styles.shareBtn,
          {
            backgroundColor: isTextOnlyReadingMode
              ? palette.accentTerracotta
              : palette.backgroundCard,
            borderColor: palette.borderSubtle,
          },
        ]}
      >
        <Text
          style={[
            styles.shareBtnText,
            { color: isTextOnlyReadingMode ? '#FFFFFF' : palette.textPrimary },
          ]}
        >
          {isTextOnlyReadingMode ? '🎬 Mostrar Vídeo' : '📖 Ler Sem Vídeo'}
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => void exportGateway.shareRecipeAsText(recipe)}
        style={[
          styles.shareBtn,
          { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
        ]}
      >
        <Text style={[styles.shareBtnText, { color: palette.textPrimary }]}>
          📤 Compartilhar
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => void exportGateway.exportRecipeAsPdf(recipe)}
        style={[
          styles.shareBtn,
          { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
        ]}
      >
        <Text style={[styles.shareBtnText, { color: palette.accentTerracotta }]}>📄 PDF</Text>
      </TouchableOpacity>
    </View>
  );
}

function UnifiedChefNotesSection(props: {
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement | null {
  const { recipe, palette } = props;
  if (!recipe.unifiedChefNotesAndNutrition.trim() && recipe.tags.length === 0) {
    return null;
  }
  return (
    <View
      style={[
        styles.notesCard,
        { backgroundColor: palette.backgroundElevated, borderColor: palette.borderSubtle },
      ]}
    >
      <Text style={[styles.notesTitle, { color: palette.accentTerracotta }]}>
        📝 Notas do Chef, Dicas & Informações Nutricionais
      </Text>
      {recipe.unifiedChefNotesAndNutrition.trim() !== '' && (
        <Text style={[styles.notesBody, { color: palette.textPrimary }]}>
          {recipe.unifiedChefNotesAndNutrition}
        </Text>
      )}
      {recipe.tags.length > 0 && (
        <Text style={[styles.tagsLine, { color: palette.textSecondary }]}>
          🏷️ Tags: {recipe.tags.join(' • ')}
        </Text>
      )}
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topNav: {
    flexDirection: 'row',
    justifyContent: 'space-between',
    alignItems: 'center',
    paddingHorizontal: 16,
    paddingVertical: 12,
    borderBottomWidth: 1,
  },
  backBtn: { paddingVertical: 6 },
  backBtnText: { fontSize: 15, fontWeight: '700' },
  navActions: { flexDirection: 'row', alignItems: 'center', gap: 8 },
  iconBtn: { padding: 6 },
  iconText: { fontSize: 18 },
  actionBtn: { paddingHorizontal: 10, paddingVertical: 7, borderRadius: 8 },
  actionBtnText: { fontSize: 12, fontWeight: '700' },
  scrollContent: { padding: 16, paddingBottom: 42 },
  heroBox: { marginBottom: 14 },
  heroImage: { width: '100%', height: 195, borderRadius: 14, marginBottom: 12 },
  categoryLabel: { fontSize: 13, fontWeight: '700', marginBottom: 4 },
  recipeTitle: { fontSize: 22, fontWeight: '800', marginBottom: 6 },
  metaStats: { fontSize: 13, fontWeight: '500' },
  shareRow: { flexDirection: 'row', gap: 8, marginBottom: 16 },
  shareBtn: {
    flex: 1,
    paddingVertical: 10,
    paddingHorizontal: 6,
    borderRadius: 10,
    borderWidth: 1,
    alignItems: 'center',
  },
  shareBtnText: { fontSize: 12, fontWeight: '700' },
  notesCard: { borderRadius: 14, borderWidth: 1, padding: 14, marginBottom: 16 },
  notesTitle: { fontSize: 15, fontWeight: '700', marginBottom: 8 },
  notesBody: { fontSize: 14, lineHeight: 21, marginBottom: 8 },
  tagsLine: { fontSize: 12, fontWeight: '600' },
});
