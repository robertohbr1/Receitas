import React from 'react';
import { StyleSheet, Text, TouchableOpacity, View } from 'react-native';
import { GastronomicColorPalette } from '../theme/gastronomicTheme';
import { PendingRecipeImportItem } from '../types/recipeTypes';

export interface PendingImportsCardProps {
  readonly palette: GastronomicColorPalette;
  readonly pendingItems: readonly PendingRecipeImportItem[];
  readonly retryingItemId: string | null;
  readonly onRetryPendingItem: (item: PendingRecipeImportItem) => void;
  readonly onRemovePendingItem: (pendingId: string) => void;
}

/**
 * Lista de links guardados na fila offline aguardando conexão para concluir a extração da receita.
 *
 * @example
 * <PendingImportsCard palette={palette} pendingItems={queue} retryingItemId={null} ... />
 */
export function PendingImportsCard(
  props: PendingImportsCardProps,
): React.ReactElement | null {
  if (props.pendingItems.length === 0) {
    return null;
  }
  const { palette, pendingItems } = props;
  return (
    <View
      style={[
        styles.container,
        { backgroundColor: palette.backgroundCard, borderColor: palette.borderSubtle },
      ]}
    >
      <Text style={[styles.title, { color: palette.accentTerracotta }]}>
        ⏳ Links Pendentes ({pendingItems.length})
      </Text>
      <Text style={[styles.subtitle, { color: palette.textSecondary }]}>
        Estes links ficaram guardados para não serem perdidos quando a internet falhou:
      </Text>
      {pendingItems.map((item) => (
        <PendingItemRow
          key={item.id}
          item={item}
          palette={palette}
          isRetrying={props.retryingItemId === item.id}
          onRetry={() => props.onRetryPendingItem(item)}
          onRemove={() => props.onRemovePendingItem(item.id)}
        />
      ))}
    </View>
  );
}

function PendingItemRow(props: {
  readonly item: PendingRecipeImportItem;
  readonly palette: GastronomicColorPalette;
  readonly isRetrying: boolean;
  readonly onRetry: () => void;
  readonly onRemove: () => void;
}): React.ReactElement {
  const { item, palette, isRetrying } = props;
  return (
    <View style={[styles.itemRow, { borderColor: palette.borderSubtle }]}>
      <View style={styles.itemInfo}>
        <Text style={[styles.itemUrl, { color: palette.textPrimary }]} numberOfLines={1}>
          {item.sourceUrl}
        </Text>
        <Text style={[styles.itemError, { color: palette.textSecondary }]} numberOfLines={1}>
          {item.lastErrorMessage}
        </Text>
      </View>
      <TouchableOpacity
        disabled={isRetrying}
        onPress={props.onRetry}
        style={[styles.retryBtn, { backgroundColor: palette.accentTerracotta }]}
      >
        <Text style={styles.retryBtnText}>{isRetrying ? '⏳' : '🔄 Tentar'}</Text>
      </TouchableOpacity>
      <TouchableOpacity
        disabled={isRetrying}
        onPress={props.onRemove}
        style={[styles.removeBtn, { borderColor: palette.borderSubtle }]}
      >
        <Text style={[styles.removeBtnText, { color: palette.textSecondary }]}>✕</Text>
      </TouchableOpacity>
    </View>
  );
}

const styles = StyleSheet.create({
  container: {
    marginHorizontal: 16,
    marginBottom: 8,
    borderWidth: 1,
    borderRadius: 14,
    padding: 12,
  },
  title: { fontSize: 13, fontWeight: '800', marginBottom: 2 },
  subtitle: { fontSize: 11, marginBottom: 8 },
  itemRow: {
    flexDirection: 'row',
    alignItems: 'center',
    gap: 6,
    borderTopWidth: 1,
    paddingTop: 8,
    marginTop: 6,
  },
  itemInfo: { flex: 1 },
  itemUrl: { fontSize: 12, fontWeight: '600' },
  itemError: { fontSize: 11 },
  retryBtn: { borderRadius: 8, paddingHorizontal: 10, paddingVertical: 6 },
  retryBtnText: { color: '#FFFFFF', fontSize: 11, fontWeight: '700' },
  removeBtn: { borderWidth: 1, borderRadius: 8, paddingHorizontal: 8, paddingVertical: 5 },
  removeBtnText: { fontSize: 12, fontWeight: '700' },
});