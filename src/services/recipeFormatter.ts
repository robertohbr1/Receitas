import { CulinaryRecipeRecord } from '../types/recipeTypes';
import { groupRecipeListIntoBlocks, RecipeListBlock } from './recipeGroupHeadings';

/**
 * Gera um texto formatado e amigável para compartilhamento em redes sociais (WhatsApp, Telegram, etc.).
 *
 * @example
 * const shareText = formatRecipeAsShareableText(recipeRecord);
 * // shareText.includes(recipeRecord.title) === true
 */
export function formatRecipeAsShareableText(recipe: CulinaryRecipeRecord): string {
  const ingredientsList = formatBlocksAsShareableText(
    groupRecipeListIntoBlocks(recipe.ingredients),
    (item) => `• ${item.text}`,
  );
  const stepsList = formatBlocksAsShareableText(
    groupRecipeListIntoBlocks(recipe.preparationSteps),
    (item) => `${item.displayNumber}. ${item.text}`,
  );
  const headerLine = `🍽️ *${recipe.title}* (${recipe.category})`;
  const metaLine = `⏱️ ${recipe.preparationMinutes} min | 🥘 ${recipe.servingsCount} porções | 📊 ${recipe.difficulty}`;
  const videoLine = recipe.videoSourceUri ? `\n🎬 Vídeo: ${recipe.videoSourceUri}` : '';
  const notesLine = recipe.unifiedChefNotesAndNutrition
    ? `\n\n📝 *Notas do Chef & Nutrição:*\n${recipe.unifiedChefNotesAndNutrition}`
    : '';
  return `${headerLine}\n${metaLine}${videoLine}\n\n🛒 *Ingredientes:*\n${ingredientsList}\n\n👩‍🍳 *Modo de Preparo:*\n${stepsList}${notesLine}`;
}

function formatBlocksAsShareableText(
  blocks: readonly RecipeListBlock[],
  formatItem: (item: RecipeListBlock['items'][number]) => string,
): string {
  return blocks
    .map((block) => {
      const lines = block.items.map(formatItem);
      return block.heading ? `*${block.heading}:*\n${lines.join('\n')}` : lines.join('\n');
    })
    .join('\n');
}

/**
 * Gera um documento HTML estilizado da receita para exportação em PDF via impressão nativa.
 *
 * @example
 * const html = formatRecipeAsPrintableHtml(recipeRecord);
 * // html.startsWith('<!DOCTYPE html>') === true
 */
export function formatRecipeAsPrintableHtml(recipe: CulinaryRecipeRecord): string {
  const ingredientsHtml = formatBlocksAsHtmlList(
    groupRecipeListIntoBlocks(recipe.ingredients),
    'ul',
  );
  const stepsHtml = formatBlocksAsHtmlList(
    groupRecipeListIntoBlocks(recipe.preparationSteps),
    'ol',
  );
  const notesBlock = buildNotesHtmlSection(recipe.unifiedChefNotesAndNutrition);
  const videoBlock = recipe.videoSourceUri
    ? `<p><strong>Vídeo de referência:</strong> ${escapeHtmlEntities(recipe.videoSourceUri)}</p>`
    : '';
  return buildHtmlTemplate(recipe, ingredientsHtml, stepsHtml, videoBlock, notesBlock);
}

function formatBlocksAsHtmlList(
  blocks: readonly RecipeListBlock[],
  tag: 'ul' | 'ol',
): string {
  return blocks
    .map((block) => {
      const headingHtml = block.heading ? `<h3>${escapeHtmlEntities(block.heading)}</h3>` : '';
      const itemsHtml = block.items
        .map((item) => `<li>${escapeHtmlEntities(item.text)}</li>`)
        .join('');
      return `${headingHtml}<${tag}>${itemsHtml}</${tag}>`;
    })
    .join('');
}

function buildNotesHtmlSection(notesText: string): string {
  if (!notesText.trim()) {
    return '';
  }
  return `<div class="notes"><h3>Notas do Chef & Informações Nutricionais</h3><p>${escapeHtmlEntities(notesText)}</p></div>`;
}

function buildHtmlTemplate(
  recipe: CulinaryRecipeRecord,
  ingredientsHtml: string,
  stepsHtml: string,
  videoBlock: string,
  notesBlock: string,
): string {
  return `<!DOCTYPE html><html><head><meta charset="utf-8"/><style>
    body { font-family: Georgia, serif; color: #2F241F; background: #FAF6F0; padding: 28px; }
    h1 { color: #C85A32; margin-bottom: 6px; }
    .meta { color: #6E5A4F; margin-bottom: 18px; font-size: 14px; }
    h2 { color: #C85A32; border-bottom: 1px solid #E6DCD0; padding-bottom: 4px; }
    h3 { color: #6E5A4F; margin: 12px 0 4px; font-size: 15px; }
    li { margin-bottom: 6px; line-height: 1.5; }
    .notes { background: #F3ECE2; padding: 14px; border-radius: 8px; margin-top: 20px; }
  </style></head><body>
    <h1>${escapeHtmlEntities(recipe.title)}</h1>
    <div class="meta">${recipe.category} • ${recipe.preparationMinutes} min • ${recipe.servingsCount} porções • Dificuldade: ${recipe.difficulty}</div>
    ${videoBlock}
    <h2>Ingredientes</h2>${ingredientsHtml}
    <h2>Modo de Preparo</h2>${stepsHtml}
    ${notesBlock}
  </body></html>`;
}

/**
 * Escapa caracteres especiais HTML para evitar quebra de marcação na geração do PDF.
 *
 * @example
 * const safe = escapeHtmlEntities('A < B & C > D');
 * // safe === 'A &lt; B &amp; C &gt; D'
 */
export function escapeHtmlEntities(rawText: string): string {
  return rawText
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;');
}