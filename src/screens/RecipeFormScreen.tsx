import React from 'react';
import {
  ScrollView,
  StyleSheet,
  Text,
  TextInput,
  TouchableOpacity,
  View,
} from 'react-native';
import { ClipboardGateway } from '../adapters/clipboardGateway';
import { MediaLibraryPickerGateway } from '../adapters/mediaPickerGateway';
import {
  isStandaloneSupportedVideoUrl,
  YoutubeVideoMetadataGateway,
} from '../adapters/youtubeMetadataGateway';
import { SmartImportModal } from '../components/SmartImportModal';
import { YoutubeQuickImportCard } from '../components/YoutubeQuickImportCard';
import {
  RecipeFormController,
  useRecipeFormController,
} from '../hooks/useRecipeFormController';
import {
  AVAILABLE_CULINARY_CATEGORIES,
  AVAILABLE_DIFFICULTY_LEVELS,
  GastronomicColorPalette,
} from '../theme/gastronomicTheme';
import {
  CulinaryCategory,
  CulinaryRecipeRecord,
  DifficultyLevel,
  RecipeDraftInput,
} from '../types/recipeTypes';

export interface RecipeFormScreenProps {
  readonly initialRecipe: CulinaryRecipeRecord | null;
  readonly palette: GastronomicColorPalette;
  readonly mediaPickerGateway: MediaLibraryPickerGateway;
  readonly youtubeGateway: YoutubeVideoMetadataGateway;
  readonly clipboardGateway?: ClipboardGateway;
  readonly onCancel: () => void;
  readonly onSaveRecipeDraft: (draft: RecipeDraftInput) => Promise<void>;
}

/**
 * Formulário de cadastro e edição de receitas com importação automática por link do YouTube.
 *
 * @example
 * <RecipeFormScreen initialRecipe={null} palette={palette} youtubeGateway={ytGateway} ... />
 */
export function RecipeFormScreen(props: RecipeFormScreenProps): React.ReactElement {
  const form = useRecipeFormController(props.initialRecipe);
  return (
    <View style={[styles.screen, { backgroundColor: props.palette.backgroundPrimary }]}>
      <FormTopHeader
        isEditing={props.initialRecipe !== null}
        palette={props.palette}
        onCancel={props.onCancel}
        onOpenSmartImport={() => form.updateField('isImportOpen', true)}
      />
      <FormScrollableFields
        form={form}
        palette={props.palette}
        mediaPickerGateway={props.mediaPickerGateway}
        youtubeGateway={props.youtubeGateway}
        clipboardGateway={props.clipboardGateway}
        onSaveRecipeDraft={props.onSaveRecipeDraft}
      />
      <SmartImportModal
        visible={form.values.isImportOpen}
        palette={props.palette}
        youtubeGateway={props.youtubeGateway}
        onClose={() => form.updateField('isImportOpen', false)}
        onApplyParsedRecipe={form.applyImportedRecipe}
        onApplyYoutubeDraft={form.applyYoutubeDraft}
      />
    </View>
  );
}

function FormScrollableFields(props: {
  readonly form: RecipeFormController;
  readonly palette: GastronomicColorPalette;
  readonly mediaPickerGateway: MediaLibraryPickerGateway;
  readonly youtubeGateway: YoutubeVideoMetadataGateway;
  readonly clipboardGateway?: ClipboardGateway;
  readonly onSaveRecipeDraft: (draft: RecipeDraftInput) => Promise<void>;
}): React.ReactElement {
  const { form, palette, youtubeGateway, onSaveRecipeDraft } = props;
  const oneClickCreate = async (url: string): Promise<void> => {
    const draft = await form.fetchAndFillFromYoutubeUrl(url, youtubeGateway);
    if (draft) await onSaveRecipeDraft(draft);
  };
  return (
    <ScrollView contentContainerStyle={styles.scrollBody}>
      <YoutubeQuickImportCard
        palette={palette}
        isFetching={form.values.isFetchingYoutube}
        onAutoFillFromYoutube={async (url) => {
          await form.fetchAndFillFromYoutubeUrl(url, youtubeGateway);
        }}
        onOneClickCreateFromYoutube={oneClickCreate}
        onReadClipboardText={
          props.clipboardGateway
            ? () => props.clipboardGateway!.readClipboardText()
            : undefined
        }
      />
      <FormMainMetadataSection
        form={form}
        palette={palette}
        mediaPickerGateway={props.mediaPickerGateway}
        youtubeGateway={youtubeGateway}
      />
      <RecipeTextAreasBlock form={form} palette={palette} />
      <TouchableOpacity
        onPress={() => void form.submitDraft(onSaveRecipeDraft)}
        style={[styles.saveBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.saveBtnText}>💾 Salvar Receita no Aparelho</Text>
      </TouchableOpacity>
    </ScrollView>
  );
}

function FormMainMetadataSection(props: {
  readonly form: RecipeFormController;
  readonly palette: GastronomicColorPalette;
  readonly mediaPickerGateway: MediaLibraryPickerGateway;
  readonly youtubeGateway: YoutubeVideoMetadataGateway;
}): React.ReactElement {
  const { form, palette } = props;
  const { values } = form;
  return (
    <View>
      {values.validationError && (
        <Text style={[styles.errorBanner, { color: palette.dangerCrimson }]}>
          ⚠️ {values.validationError}
        </Text>
      )}
      <LabeledInput
        label="Título da Receita *"
        value={values.title}
        placeholder="Ex: Lasanha à Bolonhesa da Família"
        palette={palette}
        onChangeText={(v) => form.updateField('title', v)}
      />
      <CategoryPillSelector
        selectedCategory={values.category}
        palette={palette}
        onSelectCategory={(c) => form.updateField('category', c)}
      />
      <DifficultyPillSelector
        selectedDifficulty={values.difficulty}
        palette={palette}
        onSelectDifficulty={(d) => form.updateField('difficulty', d)}
      />
      <TimeAndServingsRow form={form} palette={palette} />
      <MediaInputsBlock
        form={form}
        palette={palette}
        mediaPickerGateway={props.mediaPickerGateway}
        youtubeGateway={props.youtubeGateway}
      />
    </View>
  );
}

function RecipeTextAreasBlock(props: {
  readonly form: RecipeFormController;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { form, palette } = props;
  return (
    <View>
      <LabeledInput
        label="🛒 Ingredientes (1 por linha — use 'Massa:' ou 'Calda:' para criar grupos) *"
        value={form.values.ingredientsText}
        placeholder={'Massa:\n500g de massa de lasanha\nMolho:\n300g de queijo muçarela'}
        multiline
        height={115}
        palette={palette}
        onChangeText={(v) => form.updateField('ingredientsText', v)}
      />
      <TouchableOpacity
        onPress={form.organizeIngredientsAndSteps}
        style={[
          styles.organizeBtn,
          { backgroundColor: palette.badgeBackground, borderColor: palette.borderSubtle },
        ]}
      >
        <Text style={[styles.organizeBtnText, { color: palette.accentTerracotta }]}>
          ✨ Separar e Organizar Ingredientes / Modo de Preparo Automaticamente
        </Text>
      </TouchableOpacity>
      <LabeledInput
        label="👩‍🍳 Modo de Preparo (1 passo por linha — inclua minutos para ativar o timer!) *"
        value={form.values.stepsText}
        placeholder={'Refogue a carne por 10 minutos\nAsse em forno a 200°C por 25 minutos'}
        multiline
        height={125}
        palette={palette}
        onChangeText={(v) => form.updateField('stepsText', v)}
      />
      <LabeledInput
        label="🎙️ Transcrição do Vídeo (o que é dito no vídeo — salvo offline caso o vídeo saia do ar)"
        value={form.values.videoTranscriptText ?? ''}
        placeholder="Cole ou edite a transcrição falada do vídeo. Você pode clicar no botão acima para extrair ingredientes e passos dela."
        multiline
        height={90}
        palette={palette}
        onChangeText={(v) => form.updateField('videoTranscriptText', v)}
      />
      <LabeledInput
        label="Campo Único: Notas do Chef, Segredos e Informações Nutricionais / Calorias"
        value={form.values.unifiedNotes}
        placeholder="Ex: Dica: Use queijo ralado na hora. Nutrição: ~420 kcal por porção."
        multiline
        height={90}
        palette={palette}
        onChangeText={(v) => form.updateField('unifiedNotes', v)}
      />
      <LabeledInput
        label="Tags separadas por vírgula"
        value={form.values.tagsText}
        placeholder="Ex: Domingo, Forno, Sem Lactose"
        palette={palette}
        onChangeText={(v) => form.updateField('tagsText', v)}
      />
    </View>
  );
}

function FormTopHeader(props: {
  readonly isEditing: boolean;
  readonly palette: GastronomicColorPalette;
  readonly onCancel: () => void;
  readonly onOpenSmartImport: () => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={[styles.topHeader, { borderColor: palette.borderSubtle }]}>
      <TouchableOpacity onPress={props.onCancel}>
        <Text style={[styles.cancelLink, { color: palette.textSecondary }]}>✕ Cancelar</Text>
      </TouchableOpacity>
      <Text style={[styles.headerTitle, { color: palette.textPrimary }]}>
        {props.isEditing ? 'Editar Receita' : 'Nova Receita'}
      </Text>
      <TouchableOpacity
        onPress={props.onOpenSmartImport}
        style={[styles.importBtn, { backgroundColor: palette.badgeBackground }]}
      >
        <Text style={[styles.importBtnText, { color: palette.accentTerracotta }]}>
          ✨ Colar Link/Texto
        </Text>
      </TouchableOpacity>
    </View>
  );
}

function LabeledInput(props: {
  readonly label: string;
  readonly value: string;
  readonly placeholder: string;
  readonly palette: GastronomicColorPalette;
  readonly multiline?: boolean;
  readonly height?: number;
  readonly onChangeText: (val: string) => void;
}): React.ReactElement {
  const { palette } = props;
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>{props.label}</Text>
      <TextInput
        value={props.value}
        placeholder={props.placeholder}
        placeholderTextColor={palette.textSecondary}
        multiline={props.multiline}
        onChangeText={props.onChangeText}
        style={[
          styles.input,
          props.height ? { height: props.height, textAlignVertical: 'top' } : null,
          {
            backgroundColor: palette.backgroundCard,
            color: palette.textPrimary,
            borderColor: palette.borderSubtle,
          },
        ]}
      />
    </View>
  );
}

function CategoryPillSelector(props: {
  readonly selectedCategory: Exclude<CulinaryCategory, 'Todas'>;
  readonly palette: GastronomicColorPalette;
  readonly onSelectCategory: (cat: Exclude<CulinaryCategory, 'Todas'>) => void;
}): React.ReactElement {
  const { palette, selectedCategory } = props;
  const categories = AVAILABLE_CULINARY_CATEGORIES.filter(
    (c): c is Exclude<CulinaryCategory, 'Todas'> => c !== 'Todas',
  );
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Categoria</Text>
      <View style={styles.wrapRow}>
        {categories.map((cat) => (
          <SelectablePill
            key={cat}
            label={cat}
            isSelected={selectedCategory === cat}
            activeColor={palette.accentTerracotta}
            palette={palette}
            onPress={() => props.onSelectCategory(cat)}
          />
        ))}
      </View>
    </View>
  );
}

function DifficultyPillSelector(props: {
  readonly selectedDifficulty: DifficultyLevel;
  readonly palette: GastronomicColorPalette;
  readonly onSelectDifficulty: (diff: DifficultyLevel) => void;
}): React.ReactElement {
  const { palette, selectedDifficulty } = props;
  return (
    <View style={styles.fieldGroup}>
      <Text style={[styles.fieldLabel, { color: palette.textPrimary }]}>Dificuldade</Text>
      <View style={styles.wrapRow}>
        {AVAILABLE_DIFFICULTY_LEVELS.map((diff) => (
          <SelectablePill
            key={diff}
            label={diff}
            isSelected={selectedDifficulty === diff}
            activeColor={palette.accentSoftOrange}
            palette={palette}
            onPress={() => props.onSelectDifficulty(diff)}
          />
        ))}
      </View>
    </View>
  );
}

function SelectablePill(props: {
  readonly label: string;
  readonly isSelected: boolean;
  readonly activeColor: string;
  readonly palette: GastronomicColorPalette;
  readonly onPress: () => void;
}): React.ReactElement {
  const { palette, isSelected } = props;
  return (
    <TouchableOpacity
      onPress={props.onPress}
      style={[
        styles.pill,
        {
          backgroundColor: isSelected ? props.activeColor : palette.backgroundCard,
          borderColor: palette.borderSubtle,
        },
      ]}
    >
      <Text style={[styles.pillText, { color: isSelected ? '#FFFFFF' : palette.textPrimary }]}>
        {props.label}
      </Text>
    </TouchableOpacity>
  );
}

function TimeAndServingsRow(props: {
  readonly form: RecipeFormController;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { form, palette } = props;
  return (
    <View style={styles.twoColumns}>
      <View style={styles.halfCol}>
        <LabeledInput
          label="Tempo (minutos)"
          value={form.values.prepMinutes}
          placeholder="30"
          palette={palette}
          onChangeText={(v) => form.updateField('prepMinutes', v)}
        />
      </View>
      <View style={styles.halfCol}>
        <LabeledInput
          label="Rendimento (porções)"
          value={form.values.servings}
          placeholder="4"
          palette={palette}
          onChangeText={(v) => form.updateField('servings', v)}
        />
      </View>
    </View>
  );
}

function MediaInputsBlock(props: {
  readonly form: RecipeFormController;
  readonly palette: GastronomicColorPalette;
  readonly mediaPickerGateway: MediaLibraryPickerGateway;
  readonly youtubeGateway: YoutubeVideoMetadataGateway;
}): React.ReactElement {
  const { form, palette, mediaPickerGateway, youtubeGateway } = props;
  const onVideoChange = (val: string): void => {
    form.updateField('videoUri', val);
    if (isStandaloneSupportedVideoUrl(val) && !form.values.title.trim()) {
      void form.fetchAndFillFromYoutubeUrl(val, youtubeGateway);
    }
  };
  return (
    <View>
      <LabeledInput
        label="Vídeo da Receita (YouTube, Instagram, TikTok ou Galeria)"
        value={form.values.videoUri}
        placeholder="Cole o link https://... ou escolha da galeria abaixo"
        palette={palette}
        onChangeText={onVideoChange}
      />
      <GalleryPickerButtonsRow
        form={form}
        palette={palette}
        mediaPickerGateway={mediaPickerGateway}
      />
      <LabeledInput
        label="URL da Foto de Capa (opcional)"
        value={form.values.coverUri}
        placeholder="https://exemplo.com/foto.jpg"
        palette={palette}
        onChangeText={(v) => form.updateField('coverUri', v)}
      />
    </View>
  );
}

function GalleryPickerButtonsRow(props: {
  readonly form: RecipeFormController;
  readonly palette: GastronomicColorPalette;
  readonly mediaPickerGateway: MediaLibraryPickerGateway;
}): React.ReactElement {
  const { form, palette, mediaPickerGateway } = props;
  const pickVideo = async (): Promise<void> => {
    const uri = await mediaPickerGateway.pickRecipeVideoFromGallery();
    if (uri) form.updateField('videoUri', uri);
  };
  const pickCover = async (): Promise<void> => {
    const uri = await mediaPickerGateway.pickCoverImageFromGallery();
    if (uri) form.updateField('coverUri', uri);
  };
  return (
    <View style={styles.mediaBtnsRow}>
      <TouchableOpacity
        onPress={() => void pickVideo()}
        style={[styles.galleryBtn, { backgroundColor: palette.backgroundElevated }]}
      >
        <Text style={[styles.galleryBtnText, { color: palette.accentTerracotta }]}>
          🎬 Vídeo da Galeria
        </Text>
      </TouchableOpacity>
      <TouchableOpacity
        onPress={() => void pickCover()}
        style={[styles.galleryBtn, { backgroundColor: palette.backgroundElevated }]}
      >
        <Text style={[styles.galleryBtnText, { color: palette.textPrimary }]}>
          📷 Foto da Galeria
        </Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  screen: { flex: 1 },
  topHeader: { flexDirection: 'row', justifyContent: 'space-between', alignItems: 'center', paddingHorizontal: 16, paddingVertical: 12, borderBottomWidth: 1 },
  cancelLink: { fontSize: 14, fontWeight: '600' },
  headerTitle: { fontSize: 17, fontWeight: '800' },
  importBtn: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 8 },
  importBtnText: { fontSize: 12, fontWeight: '700' },
  scrollBody: { padding: 16, paddingBottom: 44 },
  errorBanner: { fontSize: 13, fontWeight: '700', marginBottom: 12 },
  fieldGroup: { marginBottom: 14 },
  fieldLabel: { fontSize: 13, fontWeight: '700', marginBottom: 6 },
  input: { borderWidth: 1, borderRadius: 10, paddingHorizontal: 12, paddingVertical: 10, fontSize: 14 },
  wrapRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6 },
  pill: { paddingHorizontal: 10, paddingVertical: 6, borderRadius: 14, borderWidth: 1 },
  pillText: { fontSize: 12, fontWeight: '600' },
  twoColumns: { flexDirection: 'row', gap: 10 },
  halfCol: { flex: 1 },
  mediaBtnsRow: { flexDirection: 'row', gap: 8, marginBottom: 14 },
  galleryBtn: { flex: 1, paddingVertical: 10, borderRadius: 10, alignItems: 'center' },
  galleryBtnText: { fontSize: 12, fontWeight: '700' },
  organizeBtn: { paddingVertical: 9, paddingHorizontal: 12, borderRadius: 10, borderWidth: 1, alignItems: 'center', marginBottom: 14 },
  organizeBtnText: { fontSize: 12, fontWeight: '700' },
  saveBtn: { paddingVertical: 14, borderRadius: 12, alignItems: 'center', marginTop: 8 },
  saveBtnText: { color: '#FFFFFF', fontSize: 16, fontWeight: '800' },
});
