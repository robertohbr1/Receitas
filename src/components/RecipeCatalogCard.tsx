import React from 'react';
import { Image, StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import {
  classifyRecipeVideoUri,
  formatVideoProviderLabel,
} from '../services/videoUrlClassifier';
import { GastronomicColorPalette, resolveCategoryIcon } from '../theme/gastronomicTheme';
import { CulinaryRecipeRecord } from '../types/recipeTypes';

export interface RecipeCatalogCardProps {
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
  readonly onSelectRecipe: (recipe: CulinaryRecipeRecord) => void;
  readonly onToggleFavorite: (recipeId: string) => void;
}

/**
 * Cartão visual de uma receita no catálogo com foto de capa, selo de vídeo e metadados rápidos.
 *
 * @example
 * <RecipeCatalogCard recipe={item} palette={palette} onSelectRecipe={openDetail} onToggleFavorite={toggleFav} />
 */
export function RecipeCatalogCard(props: RecipeCatalogCardProps): React.ReactElement {
  const { recipe, palette } = props;
  const videoDescriptor = classifyRecipeVideoUri(recipe.videoSourceUri);
  const previewImage = recipe.coverImageUri || videoDescriptor.thumbnailUri;
  return (
    <TouchableOpacity
      activeOpacity={0.88}
      onPress={() => props.onSelectRecipe(recipe)}
      style={[
        styles.card,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <CardCoverBanner
        previewImage={previewImage}
        recipe={recipe}
        palette={palette}
        onToggleFavorite={() => props.onToggleFavorite(recipe.id)}
      />
      <CardBodyContent
        recipe={recipe}
        videoLabel={formatVideoProviderLabel(videoDescriptor.providerKind)}
        hasVideo={videoDescriptor.providerKind !== 'none'}
        palette={palette}
      />
    </TouchableOpacity>
  );
}

function CardCoverBanner(props: {
  readonly previewImage: string | null;
  readonly recipe: CulinaryRecipeRecord;
  readonly palette: GastronomicColorPalette;
  readonly onToggleFavorite: () => void;
}): React.ReactElement {
  const { previewImage, recipe, palette } = props;
  return (
    <View style={[styles.coverWrapper, { backgroundColor: palette.backgroundElevated }]}>
      {previewImage ? (
        <Image source={{ uri: previewImage }} style={styles.coverImage} resizeMode="cover" />
      ) : (
        <View style={styles.placeholderCover}>
          <Text style={styles.placeholderEmoji}>{resolveCategoryIcon(recipe.category)}</Text>
        </View>
      )}
      <TouchableOpacity onPress={props.onToggleFavorite} style={styles.favoriteButton}>
        <Text style={styles.favoriteIcon}>{recipe.isFavorite ? '❤️' : '🤍'}</Text>
      </TouchableOpacity>
    </View>
  );
}

function CardBodyContent(props: {
  readonly recipe: CulinaryRecipeRecord;
  readonly videoLabel: string;
  readonly hasVideo: boolean;
  readonly palette: GastronomicColorPalette;
}): React.ReactElement {
  const { recipe, palette } = props;
  return (
    <View style={styles.cardBody}>
      <View style={styles.badgesRow}>
        <View style={[styles.badge, { backgroundColor: palette.badgeBackground }]}>
          <Text style={[styles.badgeText, { color: palette.accentTerracotta }]}>
            {resolveCategoryIcon(recipe.category)} {recipe.category}
          </Text>
        </View>
        {props.hasVideo && (
          <View style={[styles.badge, { backgroundColor: palette.backgroundElevated }]}>
            <Text style={[styles.badgeText, { color: palette.textSecondary }]}>
              🎬 {props.videoLabel}
            </Text>
          </View>
        )}
      </View>
      <Text style={[styles.title, { color: palette.textPrimary }]} numberOfLines={2}>
        {recipe.title}
      </Text>
      <Text style={[styles.metaRow, { color: palette.textSecondary }]}>
        ⏱️ {recipe.preparationMinutes} min • 🥘 {recipe.servingsCount} porções • 📊{' '}
        {recipe.difficulty} • 🛒 {recipe.ingredients.length} ingr.
      </Text>
    </View>
  );
}

const styles = StyleSheet.create({
  card: { borderRadius: 16, borderWidth: 1, marginBottom: 14, overflow: 'hidden' },
  coverWrapper: { height: 155, position: 'relative', justifyContent: 'center', alignItems: 'center' },
  coverImage: { width: '100%', height: '100%' },
  placeholderCover: { justifyContent: 'center', alignItems: 'center' },
  placeholderEmoji: { fontSize: 44 },
  favoriteButton: {
    position: 'absolute',
    top: 10,
    right: 10,
    backgroundColor: 'rgba(30, 22, 18, 0.65)',
    borderRadius: 20,
    padding: 7,
  },
  favoriteIcon: { fontSize: 16 },
  cardBody: { padding: 14 },
  badgesRow: { flexDirection: 'row', flexWrap: 'wrap', gap: 6, marginBottom: 8 },
  badge: { paddingHorizontal: 9, paddingVertical: 4, borderRadius: 8 },
  badgeText: { fontSize: 11, fontWeight: '700' },
  title: { fontSize: 17, fontWeight: '700', marginBottom: 6 },
  metaRow: { fontSize: 12, fontWeight: '500' },
});
