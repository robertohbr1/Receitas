# 🍲 Caderno Gastronômico — App de Receitas com Vídeos, Importação Social e Modo Cozinha

Aplicativo multiplataforma (**React Native + Expo 52 + TypeScript**) para organizar, importar, pesquisar e preparar receitas culinárias com **vídeos** (YouTube, YouTube Shorts, Instagram Reels, TikTok ou arquivos locais da galeria) e **textos estruturados**, funcionando **offline-first** no celular (Android/iOS) e no navegador **Web**.

---

## ✨ Funcionalidades Principais

### 📚 Catálogo Gastronômico Offline-First
- **Armazenamento Persistente Local**: Salva todas as receitas no dispositivo via `AsyncStorage` sem exigir criação de conta ou login.
- **Receitas Inaugurais (Seed Catalog)**: Já inicia com receitas completas pré-cadastradas para demonstração imediata.
- **Busca Inteligente Multi-Ingredientes e Sem Acentos** ([`recipeSearchEngine.ts`](file:///c:/Projetos/Receitas/src/services/recipeSearchEngine.ts)):
  - Pesquisa insensível a acentos (`"pao de acucar"` encontra `"Pão de Açúcar"`) e combinada por múltiplos termos (ex.: digite `"frango batata"` para achar receitas que usam ambos os ingredientes da geladeira).
  - Pesquisa em **título**, **categoria**, **ingredientes**, **passo a passo (`preparationSteps`)**, **tags**, **notas** e **transcrição falada do vídeo (`videoTranscriptText`)**.
- **Filtros Rápidos e Ordenação**: Chips de categorias (`Todas`, `Sobremesas`, `Massas`, `Carnes`, `Rápidas`, `Saudáveis`, `Lanches`, `Bebidas`), filtro de **Favoritas** (`❤️`), **Até 30 min** (`⚡`), **Poucos Ingredientes (≤ 6)** (`🛒`) e ordenação (`Recentes`, `Mais Rápidas`, `Menos Ingredientes`).

### 🔗 Importação Automática por Link (YouTube, Instagram Reels & Receitas Globo)
- **Criação em 1 Clique (`🚀 Criar Receita Direto`) ou Auto-Preenchimento (`⚡ Preencher Campos`)**:
  - Basta colar um link do **YouTube** (`watch?v=`, `youtu.be/`, `shorts/`), **Instagram** (`reel/`, `p/`) ou **Receitas Globo** (`receitas.globo.com/.../*.ghtml`).
  - Extrai automaticamente **título**, **foto de capa (thumbnail)**, **vídeo do Globoplay**, **canal/autor/programa**, **lista de ingredientes agrupados por etapa** (ex.: *Alcatra em tiras*, *Molho de queijo*, *Batata assada*), **modo de preparo estruturado**, **tempo estimado**, **rendimento** e **categoria culinária sugerida**.
  - **Filtro Anti-Ruído**: Remove automaticamente chamadas promocionais (*"inscreva-se"*, *"deixe seu like"*, *"comente EU QUERO"*, *"link na bio"*) e hashtags poluídas das descrições e legendas.
  - **Suporte Web & Mobile**: Conta com middleware de proxy embutido no Metro Bundler ([`metro.config.js`](file:///c:/Projetos/Receitas/metro.config.js)) e múltiplos fallbacks públicos (`allorigins`, `noembed`, metatags OpenGraph/Embed e microdados `schema.org/Recipe`) para contornar restrições de CORS no navegador.

### ✨ Importação Inteligente de Texto Colado
- Cole qualquer texto livre (legendas do TikTok/Instagram, mensagens do WhatsApp ou receitas copiadas de blogs) no **Smart Import Modal**.
- O parser heurístico ([`recipeTextParser.ts`](file:///c:/Projetos/Receitas/src/services/recipeTextParser.ts)) identifica cabeçalhos, quantidades, medidas culinárias e verbos de ação para separar automaticamente **Título**, **Ingredientes**, **Modo de Preparo**, **Tempo**, **Porções** e **Notas/Calorias**.

### 🎬 Player de Vídeo Híbrido
- **Player Embutido na Tela (Web)**: Reproduz vídeos do **YouTube / Shorts** e **Instagram Reels** diretamente dentro da tela da receita via `iframe`, ajustando automaticamente a proporção vertical (`9:16` para Shorts/Reels) ou horizontal (`16:9`), com botão para alternar entre player e foto de capa.
- **Vídeo Nativo da Galeria**: Permite escolher vídeos gravados no próprio aparelho (`expo-image-picker`) com reprodução nativa integrada (`expo-av`).
- **Abertura Externa Rápida**: Botão dedicado para abrir o vídeo diretamente no aplicativo nativo do YouTube, Instagram ou TikTok.

### 👨‍🍳 Modo Cozinha Guiado (Entendimento Sem Precisar Assistir ao Vídeo)
- **Modo Leitura Sem Vídeo (`📖 Ler Sem Vídeo`)**: Oculta o player na tela da receita para focar 100% na execução guiada em 2 etapas (**1. Ingredientes / Mise en Place** → **2. Passo a Passo**).
- **Decomposição Visual de Ingredientes (*Mise en Place*)** ([`recipeComprehensionEnhancer.ts`](file:///c:/Projetos/Receitas/src/services/recipeComprehensionEnhancer.ts)):
  - Destaca separadamente a **Quantidade + Medida** (`2 xícaras`), o **Ingrediente Principal** (`farinha de trigo`) e o **Preparo Prévio / Corte** (`🔪 peneirada`, `🔪 picada em cubos`), além do botão **`📋 Copiar Faltantes`** para gerar a lista de compras apenas dos itens ainda não separados.
- **Escalonador Proporcional de Porções** ([`portionScaler.ts`](file:///c:/Projetos/Receitas/src/services/portionScaler.ts)):
  - Aumente ou diminua o número de porções (`-` / `+`) na tela da receita e veja todas as quantidades numéricas e fracionárias (`1/2`, `2,5`, `300g`, etc.) serem recalculadas proporcionalmente em tempo real.
- **Passo a Passo Enriquecido com Ingredientes da Etapa e Modo Focado**:
  - Cada etapa do Modo de Preparo exibe automaticamente **quais ingredientes (já escalonados pelas porções!) entram naquele passo** (`🥣 Nesta etapa: 3 ovos • 1 xícara de açúcar`), o **verbo de ação** (`🔄 Bater`), a **temperatura/fogo** (`🌡️ 180°C`) e o **ponto esperado** (`👀 Ponto: até dourar`).
  - Alternância em 1 toque para o **`🎯 Modo Passo a Passo Focado`**, que exibe uma etapa por vez em fonte ampliada de bancada com botões `← Anterior` e `✓ Concluir e Próximo →`.
- **Arquivo de Transcrição Offline (Proteção contra Queda de Vídeos)** ([`VideoTranscriptArchiveCard.tsx`](file:///c:/Projetos/Receitas/src/components/VideoTranscriptArchiveCard.tsx), [`recipeTranscriptParser.ts`](file:///c:/Projetos/Receitas/src/services/recipeTranscriptParser.ts)):
  - Preserva permanentemente no aparelho tudo o que é dito no vídeo (`videoTranscriptText`), com busca interna de termos falados e botão **`🪄 Extrair Ingredientes e Passo a Passo da Transcrição`** para reconstruir receitas caso o vídeo original saia do ar.
- **Cronômetro Regressivo Inteligente** ([`cookingTimerEngine.ts`](file:///c:/Projetos/Receitas/src/services/cookingTimerEngine.ts)):
  - **Detecção Automática de Tempo**: Identifica menções de horas, minutos e segundos no texto de cada passo (ex.: *"Asse em forno a 180°C por 40 minutos"*) e exibe um botão `⏱️ Iniciar 40:00` diretamente na etapa.
  - **Barra Flutuante de Timer**: Controles de **Play/Pause**, **+1 min**, **Zerar** e atalhos rápidos (`1m`, `5m`, `10m`, `15m`).

### 📝 Campo Único Flexível (Notas do Chef & Nutrição)
- Campo consolidado para registrar **Dicas do Chef**, **Segredos de Família**, **Substituições** e **Informações Nutricionais / Calorias por porção**.

### 📤 Exportação em PDF, Compartilhamento e Backup Completo (.JSON)
- **Compartilhar Texto**: Formata a receita completa com emojis e seções organizadas para envio rápido no WhatsApp, Telegram ou e-mail.
- **Gerar PDF Estilizado**: Gera um documento PDF diagramado em estilo editorial gastronômico (`expo-print`) pronto para impressão ou compartilhamento (`expo-sharing`).
- **Backup e Troca de Aparelho (`🔄 Backup`)**:
  - Exporta todo o catálogo local em um arquivo `caderno-gastronomico-backup.json` (`expo-file-system` + `expo-sharing`) e abre o **Menu de Compartilhamento** (Download `.JSON`, Copiar JSON, WhatsApp, E-mail e Outros Apps no Android).
  - Permite restaurar/mesclar receitas em um novo celular ou PC sem duplicar registros existentes.

### 🎨 Tema Quente & Gastronômico + Modo Escuro
- Paleta inspirada em cadernos culinários artesanais (tons **Terracota**, **Creme**, **Laranja Suave** e **Verde Sálvia**) com alternância instantânea entre **Modo Claro (`☀️`)** e **Modo Escuro (`🌙`)**.

---

## 🏗️ Arquitetura e Estrutura do Projeto

O projeto segue princípios de **Clean Architecture**, **Responsabilidade Única (SRP)** e **Injeção de Dependências explícita** (adaptadores de I/O isolados por interfaces e testados com *fakes* em memória, sem uso de `any`):

```text
Receitas/
├── App.tsx                                  # Composição raiz e injeção de dependências
├── Exec.ps1                                 # Script PowerShell para inicialização rápida na Web
├── Atua.ps1                                 # Script PowerShell para atualizar o APK Android e exibir QR Code
├── metro.config.js                          # Proxy local para extração YouTube/Instagram/Globo sem bloqueio CORS
├── eas.json                                 # Perfis de build Android (APK de preview e AAB de produção)
├── src/
│   ├── adapters/                            # Gateways para APIs externas e recursos nativos
│   │   ├── mediaPickerGateway.ts            # Seleção de fotos e vídeos da galeria (expo-image-picker)
│   │   ├── recipeShareGateway.ts            # Compartilhamento de texto e geração de PDF (expo-print/sharing)
│   │   ├── storageGateway.ts                # Persistência chave-valor (AsyncStorage)
│   │   └── youtubeMetadataGateway.ts        # Extração remota de receitas do YouTube, Instagram e Receitas Globo
│   ├── components/                          # Componentes visuais focados e desacoplados
│   │   ├── BackupTransferModal.tsx          # Modal de exportação/restauração de backup (.JSON) e menu de compartilhamento
│   │   ├── CatalogHeaderBar.tsx             # Cabeçalho, barra de busca, botão de backup e filtros rápidos
│   │   ├── CategoryFilterChips.tsx          # Seletor horizontal de categorias gastronômicas
│   │   ├── CookingStepsWithTimerSection.tsx # Lista de passos com gatilho automático de cronômetro
│   │   ├── FloatingCookingTimerBar.tsx      # Painel de controle do cronômetro regressivo
│   │   ├── IngredientChecklistSection.tsx   # Checklist de ingredientes com escalonador de porções
│   │   ├── RecipeCatalogCard.tsx            # Card de receita no catálogo com badges de mídia
│   │   ├── SmartImportModal.tsx             # Modal de importação por link social ou texto colado
│   │   ├── VideoPlayerSection.tsx           # Player híbrido (iframe Web, expo-av nativo e deep link)
│   │   └── YoutubeQuickImportCard.tsx       # Card de importação em 1 clique no topo do formulário
│   ├── hooks/                               # Controladores de estado da interface
│   │   ├── useCookingSessionController.ts   # Estado do Modo Cozinha (timer, checklist e porções)
│   │   ├── useRecipeCatalogController.ts    # Estado do catálogo, busca, filtros e tema
│   │   └── useRecipeFormController.ts       # Estado, validação e preenchimento do formulário
│   ├── repositories/                        # Camada de persistência de domínio
│   │   ├── culinaryRecipeRepository.ts      # CRUD, filtragem e inicialização com seed
│   │   └── seedRecipesCatalog.ts            # Receitas inaugurais pré-cadastradas
│   ├── screens/                             # Telas principais do aplicativo
│   │   ├── CatalogScreen.tsx                # Tela de listagem e pesquisa de receitas
│   │   ├── RecipeDetailScreen.tsx           # Tela de detalhes e Modo Cozinha
│   │   └── RecipeFormScreen.tsx             # Tela de criação e edição de receitas
│   ├── services/                            # Regras de negócio puras e determinísticas
│   │   ├── cookingTimerEngine.ts            # Detecção de tempo em texto e máquina de estado do timer
│   │   ├── instagramCaptionParser.ts        # Extração e limpeza de legendas de Reels/Posts do Instagram
│   │   ├── portionScaler.ts                 # Escalonamento matemático de quantidades e frações
│   │   ├── recipeFormatter.ts               # Formatação de receitas para texto puro e HTML/PDF
│   │   ├── recipeTextParser.ts              # Parser heurístico de receitas em texto livre
│   │   ├── recipeWebsiteParser.ts           # Extração de ingredientes e passos do portal Receitas Globo
│   │   ├── videoUrlClassifier.ts            # Identificação de provedor, embed URL e dimensões de vídeo
│   │   └── youtubeDescriptionParser.ts      # Extração de metadados e receitas de páginas do YouTube
│   ├── theme/
│   │   └── gastronomicTheme.ts              # Paletas de cores (Claro/Escuro) e ícones por categoria
│   └── types/
│       └── recipeTypes.ts                   # Contratos e tipos imutáveis do domínio
└── test/                                    # Suíte de testes unitários e de integração (Jest + ts-jest)
    ├── fakes/
    │   └── InMemoryStorageGateway.ts        # Fake nomeado em memória para testes rápidos e isolados
    ├── cookingTimerEngine.test.ts
    ├── culinaryRecipeRepository.test.ts
    ├── instagramCaptionParser.test.ts
    ├── portionScaler.test.ts
    ├── recipeFormatterAndTheme.test.ts
    ├── recipeTextParser.test.ts
    ├── recipeWebsiteParser.test.ts
    ├── videoUrlClassifier.test.ts
    └── youtubeDescriptionParser.test.ts
```

---

## 🚀 Como Executar o Projeto

### Opção 1: Inicialização Rápida no Windows (PowerShell)
Execute o script [`Exec.ps1`](file:///c:/Projetos/Receitas/Exec.ps1), que instala as dependências (caso necessário), inicia o servidor Metro na porta `8081` e abre automaticamente uma única aba no navegador assim que o bundle estiver pronto:

```powershell
.\Exec.ps1
```

### Opção 2: Comandos Padrão via NPM

1. **Instale as dependências**:
   ```bash
   npm install
   ```

2. **Inicie o servidor de desenvolvimento do Expo**:
   ```bash
   npm start
   ```
   - **No Celular (Android / iOS)**: Escaneie o QR Code exibido no terminal com o aplicativo **Expo Go**.
   - **No Navegador Web**: Pressione `w` no terminal ou execute diretamente:
     ```bash
     npm run web
     ```

---

## 📦 Gerando e Atualizando o APK para Android (EAS Build)

O arquivo [`eas.json`](file:///c:/Projetos/Receitas/eas.json) já está configurado com os perfis `preview` (gera arquivo instalável `.apk`) e `production` (`.aab` para Google Play).

Para validar o código TypeScript, compilar uma nova versão do `.apk` e gerar o **QR Code de instalação** automaticamente, execute:

```powershell
.\Atua.ps1
```

Ou via linha de comando:

```bash
npx eas-cli build --platform android --profile preview
```

> **Preservação de Dados**: Como o identificador do pacote (`com.rober.cadernogastronomico`) e a assinatura digital são mantidos pela Expo, instalar uma nova versão do `.apk` por cima da atual **preserva todas as receitas salvas** no aparelho.

---

## 🧪 Testes Automatizados e Qualidade de Código

Para executar toda a suíte de testes unitários (`Jest` + `ts-jest`):

```bash
npm test
```

Para validar a tipagem estática completa do TypeScript sem emitir arquivos:

```bash
npm run typecheck
```
