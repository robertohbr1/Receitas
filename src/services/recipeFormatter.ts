import { CulinaryRecipeRecord } from '../types/recipeTypes';

/**
 * Gera um texto formatado e amigável para compartilhamento em redes sociais (WhatsApp, Telegram, etc.).
 *
 * @example
 * const shareText = formatRecipeAsShareableText(recipeRecord);
 * // shareText.includes(recipeRecord.title) === true
 */
export function formatRecipeAsShareableText(recipe: CulinaryRecipeRecord): string {
  const ingredientsList = recipe.ingredients.map((item) => `• ${item}`).join('\n');
  const stepsList = recipe.preparationSteps
    .map((step, index) => `${index + 1}. ${step}`)
    .join('\n');
  const headerLine = `🍽️ *${recipe.title}* (${recipe.category})`;
  const metaLine = `⏱️ ${recipe.preparationMinutes} min | 🥘 ${recipe.servingsCount} porções | 📊 ${recipe.difficulty}`;
  const videoLine = recipe.videoSourceUri ? `\n🎬 Vídeo: ${recipe.videoSourceUri}` : '';
  const notesLine = recipe.unifiedChefNotesAndNutrition
    ? `\n\n📝 *Notas do Chef & Nutrição:*\n${recipe.unifiedChefNotesAndNutrition}`
    : '';
  return `${headerLine}\n${metaLine}${videoLine}\n\n🛒 *Ingredientes:*\n${ingredientsList}\n\n👩‍🍳 *Modo de Preparo:*\n${stepsList}${notesLine}`;
}

/**
 * Gera um documento HTML estilizado da receita para exportação em PDF via impressão nativa.
 *
 * @example
 * const html = formatRecipeAsPrintableHtml(recipeRecord);
 * // html.startsWith('<!DOCTYPE html>') === true
 */
export function formatRecipeAsPrintableHtml(recipe: CulinaryRecipeRecord): string {
  const ingredientsHtml = recipe.ingredients
    .map((item) => `<li>${escapeHtmlEntities(item)}</li>`)
    .join('');
  const stepsHtml = recipe.preparationSteps
    .map((step) => `<li>${escapeHtmlEntities(step)}</li>`)
    .join('');
  const notesBlock = buildNotesHtmlSection(recipe.unifiedChefNotesAndNutrition);
  const videoBlock = recipe.videoSourceUri
    ? `<p><strong>Vídeo de referência:</strong> ${escapeHtmlEntities(recipe.videoSourceUri)}</p>`
    : '';
  return buildHtmlTemplate(recipe, ingredientsHtml, stepsHtml, videoBlock, notesBlock);
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
    li { margin-bottom: 6px; line-height: 1.5; }
    .notes { background: #F3ECE2; padding: 14px; border-radius: 8px; margin-top: 20px; }
  </style></head><body>
    <h1>${escapeHtmlEntities(recipe.title)}</h1>
    <div class="meta">${recipe.category} • ${recipe.preparationMinutes} min • ${recipe.servingsCount} porções • Dificuldade: ${recipe.difficulty}</div>
    ${videoBlock}
    <h2>Ingredientes</h2><ul>${ingredientsHtml}</ul>
    <h2>Modo de Preparo</h2><ol>${stepsHtml}</ol>
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
