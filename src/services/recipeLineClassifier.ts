import { formatRecipeGroupHeading, isRecipeGroupHeading } from './recipeGroupHeadings';

/**
 * Seções principais em que um texto de receita é dividido.
 */
export type RecipeSectionKind = 'ingredients' | 'steps' | 'notes';

/**
 * Resultado da análise de uma linha de cabeçalho ("Ingredientes da massa:", "Modo de preparo", "Calda:").
 * `section === null` indica um subtítulo de grupo que pode conter ingredientes, passos ou ambos.
 */
export interface RecipeSectionHeaderMatch {
  readonly section: RecipeSectionKind | null;
  readonly groupTitle: string | null;
  readonly inlineContent: string;
}

interface HeaderLineParts {
  readonly strippedLine: string;
  readonly headerPart: string;
  readonly inlineContent: string;
  readonly hasColon: boolean;
}

const MAX_HEADER_LENGTH = 50;
const MAX_GROUP_TAIL_WORDS = 4;
const GROUP_TAIL =
  '(?:\\s+(?:(?:d[aeo]s?|para|pra|pro)\\s+(?:(?:o|a|os|as)\\s+)?|(?:o|a|os|as)\\s+)(.+))?';

const SECTION_HEADER_RULES: ReadonlyArray<{ section: RecipeSectionKind; pattern: RegExp }> = [
  {
    section: 'ingredients',
    pattern: new RegExp(
      `^(?:lista de )?(?:ingredientes?|o que voc[eê] vai precisar|voc[eê] vai precisar(?: de)?|vai precisar de)${GROUP_TAIL}$`,
    ),
  },
  {
    section: 'steps',
    pattern: new RegExp(
      `^(?:modo de (?:preparo|fazer|prepara[cç][aã]o)|como (?:fazer|preparar)|preparo|prepara[cç][aã]o|passo a passo|instru[cç](?:oes|ões))${GROUP_TAIL}$`,
    ),
  },
  {
    section: 'notes',
    pattern:
      /^(?:dicas?(?: d[aeo] chef)?|notas?|observa[cç](?:oes|ões|ao|ão)|obs|informa[cç](?:ao|ão|oes|ões) nutriciona(?:l|is)|tabela nutricional|valor(?:es)? nutriciona(?:l|is)|calorias|nutri[cç](?:ao|ão)|varia[cç](?:oes|ões|ao|ão)|sugest(?:ao|ão|oes|ões)(?: de [a-zà-ÿ ]+)?|armazenamento|conserva[cç](?:ao|ão)|validade)()$/,
  },
];

// Componentes clássicos que aparecem como subtítulo com ou sem dois-pontos ("MASSA", "Para a calda").
const KNOWN_GROUP_WORDS =
  'massa|massinha|calda|recheio|cobertura|molho|marinada|farofa|creme|montagem|finaliza[cç](?:ao|ão)|decora[cç](?:ao|ão)|glac[eê]|ganache|crosta|tempero|caldo|base|topping|chantilly|caramelo|merengue|suspiro|acompanhamento';
const KNOWN_GROUP_PATTERN = new RegExp(
  `^(?:(?:para|pra|pro)\\s+(?:o|a|os|as)\\s+)?(?:${KNOWN_GROUP_WORDS})(?:\\s+(?:d[aeo]s?)\\s+[a-zà-ÿ]+)?$|^(?:para|pra)\\s+(?:o|a|os|as)\\s+[a-zà-ÿ ]{3,30}$|^para\\s+(?:decorar|finalizar|servir|montar)$`,
);

/**
 * Analisa se a linha é um cabeçalho de seção ou subtítulo de grupo, extraindo o conteúdo após ":".
 *
 * @example
 * const match = analyzeSectionHeaderLine('Ingredientes da massa:');
 * // match => { section: 'ingredients', groupTitle: 'Massa:', inlineContent: '' }
 */
export function analyzeSectionHeaderLine(line: string): RecipeSectionHeaderMatch | null {
  const parts = splitHeaderAndInlineContent(line);
  const normalized = normalizeHeaderText(parts.headerPart);
  if (!normalized || normalized.length > MAX_HEADER_LENGTH) {
    return null;
  }
  return matchMainSectionHeader(normalized, parts) ?? matchGroupHeading(normalized, parts);
}

/**
 * Detecta se uma linha é um cabeçalho de seção (ingredientes, preparo ou notas/nutrição).
 *
 * @example
 * const section = detectSectionHeader('Modo de Preparo:');
 * // section === 'steps'
 */
export function detectSectionHeader(line: string): RecipeSectionKind | null {
  const match = analyzeSectionHeaderLine(line);
  if (!match) return null;
  return match.section ?? (match.groupTitle ? 'ingredients' : null);
}

function splitHeaderAndInlineContent(line: string): HeaderLineParts {
  const strippedLine = stripLeadingBulletOrNumber(line);
  const colonIndex = strippedLine.indexOf(':');
  if (colonIndex === -1) {
    return { strippedLine, headerPart: strippedLine, inlineContent: '', hasColon: false };
  }
  return {
    strippedLine,
    headerPart: strippedLine.slice(0, colonIndex),
    inlineContent: strippedLine.slice(colonIndex + 1).trim(),
    hasColon: true,
  };
}

function normalizeHeaderText(headerPart: string): string {
  return headerPart
    .toLowerCase()
    .replace(/[^a-z0-9à-öø-ÿ\s]/g, ' ')
    .replace(/\s+/g, ' ')
    .trim();
}

function matchMainSectionHeader(
  normalized: string,
  parts: HeaderLineParts,
): RecipeSectionHeaderMatch | null {
  for (const rule of SECTION_HEADER_RULES) {
    const match = normalized.match(rule.pattern);
    if (!match) continue;
    const tail = (match[1] ?? '').trim();
    if (tail.split(/\s+/).length > MAX_GROUP_TAIL_WORDS) return null;
    const groupTitle = tail && !/\d/.test(tail) ? formatRecipeGroupHeading(tail) : null;
    return { section: rule.section, groupTitle, inlineContent: parts.inlineContent };
  }
  return null;
}

function matchGroupHeading(
  normalized: string,
  parts: HeaderLineParts,
): RecipeSectionHeaderMatch | null {
  const isKnownGroup = KNOWN_GROUP_PATTERN.test(normalized);
  const isColonHeading =
    parts.hasColon && !parts.inlineContent && isRecipeGroupHeading(parts.strippedLine);
  const looksLikeWrappedContinuation = !parts.hasColon && /^[a-zà-ÿ]/.test(parts.strippedLine);
  if ((!isKnownGroup && !isColonHeading) || looksLikeWrappedContinuation) {
    return null;
  }
  const visibleTitle = parts.headerPart.replace(/^[^A-Za-zÀ-ÿ]+|[^A-Za-zÀ-ÿ)]+$/g, '');
  return {
    section: null,
    groupTitle: formatRecipeGroupHeading(visibleTitle || normalized),
    inlineContent: parts.inlineContent,
  };
}

const INSTRUCTION_VERBS: readonly string[] = [
  'misture', 'misturar', 'mistura', 'bata', 'bater', 'bate', 'asse', 'assar', 'assa',
  'leve', 'levar', 'leva', 'adicione', 'adicionar', 'acrescente', 'acrescentar', 'coloque',
  'colocar', 'coloca', 'despeje', 'despejar', 'refogue', 'refogar', 'cozinhe', 'cozinhar',
  'frite', 'fritar', 'mexa', 'mexer', 'reserve', 'reservar', 'sirva', 'servir', 'deixe',
  'deixar', 'modele', 'modelar', 'unte', 'untar', 'derreta', 'derreter', 'derrete', 'aqueça',
  'aquecer', 'preaqueça', 'pré-aqueça', 'preaqueca', 'corte', 'cortar', 'pique', 'picar',
  'rale', 'ralar', 'tempere', 'temperar', 'ferva', 'ferver', 'retire', 'retirar', 'tire',
  'desligue', 'desligar', 'junte', 'juntar', 'incorpore', 'incorporar', 'polvilhe',
  'polvilhar', 'espalhe', 'espalhar', 'cubra', 'cobrir', 'enrole', 'enrolar', 'recheie',
  'rechear', 'decore', 'decorar', 'finalize', 'finalizar', 'transfira', 'transferir', 'passe',
  'passar', 'peneire', 'peneirar', 'lave', 'lavar', 'descasque', 'descascar', 'escorra',
  'escorrer', 'amasse', 'amassar', 'sove', 'sovar', 'abra', 'abrir', 'feche', 'fechar',
  'regue', 'regar', 'salpique', 'grelhe', 'grelhar', 'doure', 'dourar', 'triture', 'triturar',
  'processe', 'processar', 'coe', 'coar', 'distribua', 'distribuir', 'monte', 'montar',
  'divida', 'dividir', 'separe', 'separar', 'aguarde', 'aguardar', 'espere', 'esperar',
  'ligue', 'ligar', 'tampe', 'tampar', 'vire', 'virar', 'sele', 'selar', 'marine', 'marinar',
  'hidrate', 'hidratar', 'dissolva', 'dissolver', 'mantenha', 'repita', 'faça', 'fazer',
  'prepare', 'preparar', 'comece', 'pegue', 'forre', 'forrar', 'enfarinhe', 'congele',
  'congelar', 'gele', 'gelar', 'resfrie', 'resfriar', 'desenforme', 'desenformar', 'prove',
  'ajuste', 'acerte', 'umedeça', 'encha', 'enforme', 'raspe', 'envolva', 'dobre', 'toste',
  'escalde', 'escaldar', 'esprema', 'espremer', 'volte', 'voltar', 'repouse', 'descanse',
  'descansar', 'abaixe', 'aumente', 'reduza', 'reduzir', 'apague', 'quebre', 'bata-os',
];

const INSTRUCTION_VERB_PATTERN = new RegExp(
  `^(?:${INSTRUCTION_VERBS.map(escapeRegexLiteral).join('|')})(?![a-zà-ÿ])`,
  'i',
);
const INSTRUCTION_VERB_ANYWHERE_PATTERN = new RegExp(
  `(?:^|\\s)(?:${INSTRUCTION_VERBS.map(escapeRegexLiteral).join('|')})(?![a-zà-ÿ])`,
  'i',
);
const INSTRUCTION_CONNECTOR_PATTERN =
  /^(?:em seguida|depois|ap[oó]s|por fim|por [uú]ltimo|finalmente|enquanto|quando|assim que|primeiro|primeiramente|agora|ent[aã]o|com (?:a ajuda|o aux[ií]lio|o fogo|as m[aã]os|um garfo|uma colher|um fouet)|aos poucos|(?:voc[eê]\s+)?vai\s+[a-zà-ÿ]+r)\b/i;
const INSTRUCTION_CONTAINER_PATTERN =
  /^(?:em|numa?|no|na|nos|nas)\s+(?:(?:uma?|outra|outro|a|o|mesma|mesmo|sua|seu)\s+)*(?:tigela|panela|f[oô]rma|frigideira|assadeira|vasilha|recipiente|bowl|liquidificador|batedeira|processador|mixer|travessa|refrat[aá]rio|micro-?ondas|forno|fogo|geladeira|freezer|congelador|copo|caneca|pote|prato|wok|ca[cç]arola|leiteira|bacia|cumbuca|bancada|superf[ií]cie)/i;
const CONVERSATIONAL_INTRO_PATTERN =
  /^(?:hoje\s+(?:eu\s+)?vou|vou\s+te\s+ensinar|vem\s+aprender|aprenda\s+a\s+fazer|essa\s+receita|quem\s+mais\s+ama)/i;
const STARTS_WITH_QUANTITY_PATTERN =
  /^(?:\d+(?:[.,/]\d+)?(?![.)\d])|[½¼¾⅓⅔⅛]|(?:meia|meio|uma?|duas|dois|tr[eê]s|quatro)\s+(?:x[ií]cara|colher|lata|caixinha|caixa|pacote|pitada|dente|copo|fio|ramo|folha|unidade|ovo|cebola|cenoura|banana|lim[aã]o|tomate))/i;

function escapeRegexLiteral(rawText: string): string {
  return rawText.replace(/[.*+?^${}()|[\]\\-]/g, '\\$&');
}

/**
 * Identifica se uma linha é instrução de preparo: começa com verbo culinário, conector
 * ("Em seguida", "Depois"), recipiente ("Em uma tigela") ou é uma frase longa com verbo.
 *
 * @example
 * const isStep = looksLikeCookingInstructionSentence('Em uma tigela, misture os ovos');
 * // isStep === true
 */
export function looksLikeCookingInstructionSentence(cleanedLine: string): boolean {
  const normalized = stripLeadingBulletOrNumber(cleanedLine).trim();
  if (CONVERSATIONAL_INTRO_PATTERN.test(normalized)) {
    return false;
  }
  if (
    INSTRUCTION_VERB_PATTERN.test(normalized) ||
    INSTRUCTION_CONNECTOR_PATTERN.test(normalized) ||
    INSTRUCTION_CONTAINER_PATTERN.test(normalized)
  ) {
    return true;
  }
  const isLongProse = normalized.split(/\s+/).length >= 10 && !/\ba gosto$/i.test(normalized);
  return (
    isLongProse &&
    !STARTS_WITH_QUANTITY_PATTERN.test(normalized) &&
    INSTRUCTION_VERB_ANYWHERE_PATTERN.test(normalized)
  );
}

const MEASUREMENT_UNIT_PATTERN =
  /\b(\d+\s*(g|gr|gramas?|kg|quilos?|ml|l|litros?|x[ií]caras?|xic|colher(?:es)?|pitadas?|dentes?|unidades?|pacotes?|latas?|caixinhas?|caixas?|copos?|ma[cç]os?|ramos?|folhas?|fatias?|peda[cç]os?|potes?|sach[eê]s?|tabletes?|envelopes?|gotas?|ovos?|cebolas?|cenouras?|bananas?|lim[oõ]es?|tomates?)|a gosto|q\.?\s?b\.?|quanto baste|para\s+(?:untar|fritar|polvilhar|decorar|empanar|pincelar)|meia x[ií]cara|uma pitada|uma x[ií]cara|um punhado|um fio de)\b/i;

/**
 * Estima se uma linha avulsa possui formato típico de ingrediente culinário.
 *
 * @example
 * const isIng = looksLikeIngredientLine('2 colheres de sopa de manteiga');
 * // isIng === true
 */
export function looksLikeIngredientLine(line: string): boolean {
  if (looksLikeCookingInstructionSentence(line)) {
    return false;
  }
  const cleaned = stripLeadingBulletOrNumber(line);
  const startsWithBullet = /^\s*[-•*▪◦·]\s+/.test(line);
  const isShortEnough = cleaned.length < 100;
  const hasQuantity =
    STARTS_WITH_QUANTITY_PATTERN.test(cleaned) || MEASUREMENT_UNIT_PATTERN.test(cleaned);
  return isShortEnough && (startsWithBullet || hasQuantity);
}

/**
 * Reconhece nomes curtos de ingrediente sem quantidade ("sal", "cheiro-verde", "farinha de trigo").
 *
 * @example
 * looksLikeShortIngredientName('Farinha de trigo'); // true
 * looksLikeShortIngredientName('Fica uma delícia, faça hoje!'); // false
 */
export function looksLikeShortIngredientName(cleanedLine: string): boolean {
  const trimmed = cleanedLine.trim();
  const wordCount = trimmed.split(/\s+/).length;
  return (
    trimmed.length > 1 &&
    trimmed.length <= 40 &&
    wordCount <= 5 &&
    !/[.!?:]$/.test(trimmed) &&
    !looksLikeCookingInstructionSentence(trimmed)
  );
}

/**
 * Detecta dicas, observações e informações nutricionais que pertencem ao campo de notas.
 *
 * @example
 * looksLikeNutritionOrNoteLine('Obs: pode congelar por 3 meses'); // true
 */
export function looksLikeNutritionOrNoteLine(line: string): boolean {
  const cleaned = stripLeadingBulletOrNumber(line);
  return (
    /\b(kcal|calorias|prote[ií]nas?|carboidratos?|gorduras? totais)\b/i.test(cleaned) ||
    /^(?:dica|obs|observa[cç][aã]o|nota|importante|aten[cç][aã]o|segredo)\s*[:\-!]/i.test(cleaned)
  );
}

/**
 * Detecta linhas de rendimento/tempo ("Rende 12 fatias", "Tempo de preparo: 40 min") que não são itens.
 *
 * @example
 * looksLikeYieldOrTimeMetadataLine('Rendimento: 8 porções'); // true
 */
export function looksLikeYieldOrTimeMetadataLine(line: string): boolean {
  const cleaned = stripLeadingBulletOrNumber(line);
  if (cleaned.length > 70) return false;
  // "Serve com arroz" é passo; só é metadado quando há ":" ou número logo após o rótulo.
  const hasLabelAndValue =
    /^(?:rendimento|rende|serve|por[cç](?:[oõ]es|[aã]o)|tempo(?:\s+(?:total|de\s+[a-zà-ÿ]+))?|dificuldade|n[ií]vel)\b\s*(?::|[-–]\s|(?=\d))\s*\S/i;
  return hasLabelAndValue.test(cleaned);
}

const LEADING_BULLET_OR_EMOJI_PATTERN =
  /^(?:[-–—•*·▪▫◦●○■□►▶➤➔→]|[\uD83C-\uD83E][\uDC00-\uDFFF]|[\u2600-\u27BF]|[\u2B00-\u2BFF]|\uFE0F|\u200D)+\s*/;
const LEADING_NUMBERING_PATTERN =
  /^(?:passo\s*)?\d{1,2}(?:\uFE0F?\u20E3|\s*[ºª°]\s*(?:passo)?\s*[:.\-–)]?|[.):](?!\d)|\s*[-–](?!\s*\d)|\s+passo\b\s*[:.\-–)]?)\s*/i;

/**
 * Remove marcadores de lista, emojis iniciais ou numeração de uma linha de texto.
 *
 * @example
 * const clean = stripLeadingBulletOrNumber('1. Misture bem os ovos');
 * // clean === 'Misture bem os ovos'
 */
export function stripLeadingBulletOrNumber(line: string): string {
  return line
    .trim()
    .replace(LEADING_BULLET_OR_EMOJI_PATTERN, '')
    .replace(LEADING_NUMBERING_PATTERN, '')
    .trim();
}

/**
 * Indica se a linha começava com marcador ou numeração (itens marcados nunca são mesclados).
 *
 * @example
 * hasLeadingListMarker('2) Asse por 20 minutos'); // true
 * hasLeadingListMarker('2 ovos'); // false
 */
export function hasLeadingListMarker(line: string): boolean {
  return stripLeadingBulletOrNumber(line) !== line.trim();
}