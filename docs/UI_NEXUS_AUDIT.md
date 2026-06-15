# UI_NEXUS_AUDIT — Auditoria UX/UI + incorporação Nexus (Fase 3 / UI-0)

> **Tipo:** auditoria read-only (nenhum código de UI alterado). **Data:** 2026-06-14.
> **Alvo:** `COMUNIDADE/` (CODEX Community / **Portal Nexus**) — Next.js 16 + React 19 + Tailwind 4 + shadcn/ui (new-york, zinc).
> **Kit a incorporar:** `c:\Users\ASUS\Desktop\NEXUS\nexus-ui` (CSS + React, **sem deps**).
> **Decisões do dono:** profundidade **C (profunda faseada)** · base **refined-dark** · **neon controlado** · **adotar motor de tema Nexus** (toggle + accent + SettingsDrawer). Direção: tech premium, futurista, escura, **legível** (sem gamer exagerado).
> **Regra central:** mexer fundo no **visual**, **não** na lógica (Auth/RLS/Owner/Ban/Server Actions/permissões intocados).

---

## Resumo executivo
A UI atual é **tecnicamente saudável e consistente** (shadcn token-driven, acessível, sem dead-code visual relevante além do dark-mode não usado), porém **genérica, light-only e sem identidade**. O `nexus-ui` é uma **base de design system madura** (tokens oklch em 3 eixos, motor de tema com accent por hue, componentes utilitários) e **100% compatível** com o stack (RSC-safe nos primitivos, 0 dependências). A incorporação mais limpa é **token-first**: trocar a fonte dos tokens do shadcn pela paleta Nexus (bridge em `globals.css`), ligar o `<html>` em dark-first com o motor Nexus, e **corrigir ~10 pontos de cor hardcoded** que não seguem tokens. Isso restila ~75-80% do app automaticamente; o restante é trabalho por página, faseado (UI-1→UI-5), tudo em localhost.

**Risco principal:** o `base.css` do Nexus tem reset global que conflita com o preflight do Tailwind → **não importar inteiro** (cherry-pick). Risco secundário: contraste/legibilidade no dark em telas densas (admin/listas) → QA por rota.

## Scores
| Dimensão | Score | Justificativa |
|---|:---:|---|
| **UI atual** | **6.5/10** | Consistente, acessível, token-driven; mas light-only, genérica, sem identidade, ~10 hotspots hardcoded, dark-mode morto. |
| **nexus-ui (fundação)** | **8.0/10** | Tokens oklch em 3 eixos + accent por hue, motor de tema portável, primitivos RSC-safe, Geist, 0 deps. Perde por nomes de token ≠ shadcn (precisa bridge) e `base.css` conflitante. |
| **Risco de incorporação** | **MÉDIO** | Mitigável: bridge completo + cherry-pick base + faseamento + QA de contraste. Sem mudança de banco/lógica. |
| **Prontidão p/ implementar** | **ALTA** | Arquitetura clara, 0 deps novas, caminho token-first reversível. |

---

## Bloco 0 — Baseline (estado atual)

**Stack visual:** Tailwind 4 com config em CSS (`src/app/globals.css`, `@import "tailwindcss"` + `@theme inline`), tokens **oklch** em `:root` (light) e `.dark` (definido mas **não usado** — sem toggle). shadcn "new-york", `baseColor: zinc`, ícones **lucide**. Fontes **Geist** + Geist Mono via `next/font` (`src/app/layout.tsx`), variáveis `--font-geist-sans/mono`. `<html>` tem `suppressHydrationWarning` (bom p/ tema). Toaster: **sonner** (`top-right richColors`).

**Layouts:** root (`app/layout.tsx`) → grupos `(auth)` (split dark/light), `(app)` (sidebar+header+mobile-nav, gate `requireActiveProfile`), `admin` (gate `requireAdmin` + nav de abas), e `banned` (fora de grupo). 

**Componentes:** 20 shadcn em `components/ui/*`; shell em `components/layout/*` (sidebar/header/mobile-nav/nav-items); `components/shared/*` (empty-state, role/level-badge, user-avatar, confirm-dialog, confirm-delete-icon-button, markdown, cookie-consent); feature em `components/community/*`, `components/courses/*`, `components/calendar/*`.

**Tokens consumidos:** botões/cards/inputs/badges/tabs/select/dropdown/checkbox/switch/progress usam **tokens semânticos** (`bg-primary/card/muted/accent`, `border`, `ring`, `text-*-foreground`) → trocar a fonte dos tokens cascateia.

**O que NÃO pode regredir (invariantes funcionais):**
- Auth: login/register/forgot/callback + redirects; **/banned** acessível e logout funcionando.
- **Owner protegido** em `/admin/members` (linha do owner sem dropdown/ban — "Owner protegido").
- Gate de rotas: deslogado→/login; banido→/banned; membro comum não acessa /admin.
- Estados vazios, loading, erro, 404, global-error renderizando.
- Mobile: sidebar→Sheet + MobileNav inferior; nada quebrado.
- Contraste legível; foco visível; toasts e formulários operando.

**Critérios objetivos antes/depois:** (1) `pnpm typecheck/lint/build` verdes; (2) as 25 rotas renderizam sem erro de console; (3) contraste de texto principal ≥ ~4.5:1 e de texto secundário ≥ ~3:1 no dark; (4) foco visível em todos os interativos; (5) nenhuma regressão nos invariantes acima; (6) mobile 360px sem overflow horizontal.

---

## Bloco 1 — Inconsistências
| ID | Inconsistência | Evidência | Severidade |
|---|---|---|---|
| INC-1 | **Naming CODEX vs Portal Nexus** | `app/layout.tsx:19-20` metadata "CODEX Community"; landing/footer "CODEX Community · MVP"; mas o produto é "Portal Nexus". | Média |
| INC-2 | **Dark-mode morto** | `globals.css:47-84` define `.dark` completo, mas nada aplica `class="dark"` nem há toggle → CSS inerte. | Média |
| INC-3 | **Light-only vs intenção dark** | App renderiza light por padrão; a identidade desejada é dark/cyberpunk. | Alta (motiva a fase) |
| INC-4 | **Badges com cor crua em inglês no admin** | `admin/courses/page.tsx` status `published/draft`; `admin/posts/page.tsx` categoria slug — não usa rótulo PT-BR nem token. | Baixa |
| INC-5 | **Sucesso/alerta hardcoded** | `ui/badge.tsx:14-15` emerald/amber; `register-form.tsx:16-17` emerald; `courses/[courseId]/page.tsx:77` emerald-500 — fora do sistema de tokens. | Média |
| INC-6 | **Linguagem "MVP/beta" pública** | `page.tsx` badge "em beta" + footer "MVP" — destoa de "premium". | Baixa |
| INC-7 | **Estados vazios desiguais** | alguns `EmptyState` só com `title` (admin apps/events/resources), outros com descrição/ação. | Baixa |

## Bloco 2 — Duplicações (oportunidade de design system, sem abstração prematura)
| ID | Padrão duplicado | Locais | Ação sugerida |
|---|---|---|---|
| DUP-1 | **Composer form admin** (`useState(form)+update<K>+FormData`) | `admin/{courses/new,apps,events,resources}` + `settings-form` (5×) | Após o tema, extrair `useFormState` — **não nesta fase**. |
| DUP-2 | **Delete inline** (useTransition+toast+ConfirmDeleteIconButton) | `admin/{posts,resources,apps,events}` (4×) | `DeleteInline` genérico — fase futura. |
| DUP-3 | **3 nomes de retorno de action** | `ActionState/ActionResult/Result` | Fora do escopo UI. |
| DUP-4 | **Card+grid 3-col** repetido | courses/resources/apps/landing | O design system unifica via tokens (`.card`/Card restilado) — sem novo componente agora. |
| DUP-5 | **levelFromPoints (dead) duplica recalc_level SQL** | `constants.ts:64` | Não-UI; remover em limpeza futura. |
> Regra: nesta fase **não** criar abstrações; só **unificar via tokens/estilos**. Refactors de duplicação ficam para depois do tema estabilizar.

## Bloco 3 — Sobreposições (tokens × resets × estilos)
| Camada | Papel hoje | Sobreposição/Conflito com Nexus |
|---|---|---|
| **shadcn/ui** | componentes (cva + utilitárias Tailwind) | **Manter como base.** Restilados via tokens. Sem conflito de classe (utilitário vs BEM). |
| **Tailwind tokens** (`@theme inline`) | mapeiam `--color-*` ← vars CSS | **Ponto do bridge:** apontar `--background/--primary/...` para vars Nexus. |
| **globals.css `:root`/`.dark`** | define a paleta oklch zinc | **Será reescrito** para a paleta Nexus (ou aliasado às vars Nexus). |
| **nexus tokens.css** | `--bg-*/--fg-*/--accent*` por `data-style` | Nomes ≠ shadcn → **precisa bridge** (`--background:var(--bg-app)`...). |
| **nexus base.css** | reset `*`,`body`,`button`,`a`,`input`+scrollbar+selection+focus | ⚠️ **CONFLITO** com preflight Tailwind/shadcn → **não importar inteiro**; cherry-pick scrollbar/`::selection`/`:focus-visible`. `button{background:none;border:0}` quebraria estilos base se importado (classes shadcn vencem por especificidade, mas é risco desnecessário). |
| **nexus components.css** | `.btn/.card/.badge/.toast/.toggle/.input/.drawer/.empty/...` | **Sem colisão** com utilitários Tailwind; usar pontualmente (ex.: SettingsDrawer usa `.drawer*`). |
| **nexus primitives** | Button/Badge/Toggle/Toast (classes `.btn` etc.) | **Coexistem** com shadcn; usar só onde fizer sentido (ex.: Toggle/SettingsDrawer). Não substituir shadcn em massa. |
| **hardcoded** (`bg-zinc/black/white/emerald/amber/#hex`) | ~10 pontos | **Quebram o tema** → converter para tokens (lista no Bloco 5). |
> **Glow/glass:** o kit **não** tem classe `.glass`/`.mesh`; o glow é o **token `--glow`** (usado em `.btn--primary`). Glass/mesh, se desejados, são CSS custom — usar com moderação.

---

## Bloco 4 — Legacy / morto (classificado)
| Item | Local | Classificação |
|---|---|---|
| Bloco `.dark` (oklch) não usado | `globals.css:47-84` | **Adaptar** — vira o tema dark real (ou substituído pelo bridge Nexus). |
| Variantes `dark:` espalhadas (ex.: landing, course-card) | `page.tsx`, `course-card.tsx:31` | **Adaptar** — no dark-first deixam de ser "hover do tema"; revisar. |
| Branding "MVP/beta" | `page.tsx:80,214` | **Adaptar** (linguagem premium). |
| `levelFromPoints` dead code | `constants.ts:64` | **Remover depois** (não-UI). |
| `ConfirmDialog` não usado | `components/shared/confirm-dialog.tsx` | **Remover depois** (não-UI; duplica ConfirmDeleteIconButton). |
| nexus-ui `base.css`, `boot.js`, `fonts.html`, `SettingsDrawer` demos | pasta `nexus-ui/` | **Legado externo** — copiar só o necessário; não usar `base.css`/`fonts.html` (Geist já via next/font). |
> Nenhum arquivo será removido nesta fase (regra). Itens "remover depois" são limpeza pós-tema.

## Bloco 5 — Bugs visuais / tipagem fraca / hardcoded que impede tema
**Hotspots de cor hardcoded (quebram o tema — corrigir em UI-1):**
| ID | Local | Trecho | Correção |
|---|---|---|---|
| HC-1 | `components/ui/dialog.tsx:20` | `bg-black/60 backdrop-blur-sm` (overlay) | token novo `--overlay` → `bg-[var(--overlay)]`. |
| HC-2 | `components/ui/sheet.tsx:20` | `bg-black/60` (overlay) | idem `--overlay`. |
| HC-3 | `components/ui/badge.tsx:14-15` | `bg-emerald-500/15 text-emerald-700` / `amber` | tokens `--success`/`--warning` (+ `-foreground`). |
| HC-4 | `app/(auth)/register/register-form.tsx:16-17` | `border-emerald-500/30 bg-emerald-500/10 text-emerald-600` | usar `--success`. |
| HC-5 | `app/(app)/courses/[courseId]/page.tsx:77` | `text-emerald-500` (check concluído) | `text-[var(--success)]`. |
| HC-6 | `components/courses/course-card.tsx:31` | `bg-zinc-100 text-zinc-400 dark:bg-zinc-800` (placeholder) | `bg-muted text-muted-foreground`. |
| HC-7 | `components/courses/lesson-player.tsx:44` | `bg-black` (vídeo) | token `--video-bg` (≈ `--bg-inset`). |
| HC-8 | `app/page.tsx:21,23,105,197,200` | zinc/white/`bg-zinc-950 text-zinc-100` (hero/CTA/cards) | redesenhar com tokens (landing P1). |
| HC-9 | `app/(auth)/layout.tsx:7,16,19` | `bg-zinc-950 text-zinc-100/400/500` (painel split) | tokens (`--bg-inset`/`--fg-*`). |
| HC-10 | `app/global-error.tsx:27-44` | `#0a0a0a/#fafafa/#333` inline | tokens/hex Nexus (é fallback fora do React tree — manter inline mas com cores Nexus). |
> **Não** são bug de cor (ok no dark): `opacity-70` em dialog close (`:43`), sheet close (`:58`), `label.tsx:14` (disabled), `calendar/page.tsx:48` (evento passado). `settings-form.tsx:63` placeholder `#0a0a0a` e `settings/page.tsx:30` default são **dado** (cor da comunidade), não tema — deixar.

**Tipagem/props frágeis pós-troca:**
- Muitos `as string|number|boolean` nas pages (consequência do `types/db.ts` stub) — **não** quebram com a troca visual (são dados), mas ruído. Fora do escopo UI.
- Componentes **client desnecessários:** baixo — a maioria das pages é RSC; `member-row`, `post-card`, `lesson-player`, `rsvp-button`, forms são client por necessidade (interação). O **ThemeProvider/SettingsDrawer** adicionam 1 ilha client no shell (ver Bloco 8).
- Risco TS: adicionar `data-*` no `<html>` e o `BOOT_SCRIPT` (string) não afeta tipos. As props de `Card/Button/Badge` não mudam (só estilo via token).

## Bloco 6 — Acessibilidade / contraste (refined-dark)
- **refined-dark** (`tokens.css [data-style="refined"]`): `--bg-app oklch(0.17…)`, `--fg-1 oklch(0.96…)` → contraste texto-principal **alto** (~13:1). `--fg-3 oklch(0.66)` (muted) sobre bg ~ **4.5:1** (ok para texto secundário ≥14px); `--fg-4 oklch(0.50)` (dim) é **baixo** → usar só para meta/hints grandes, **não** para texto essencial.
- **Accent cyan (hue 200)** como cor de ação: garantir `--accent-fg` (escuro) em botões primários (já é `oklch(0.12…)`); links em accent precisam de underline/peso para não depender só de cor.
- **Foco visível:** `base.css` define `:focus-visible: 2px solid var(--accent-line)` → **cherry-pick** (mantém acessível). shadcn já usa `ring`.
- **Neon/glow:** manter `--glow` **sutil** (refined usa `--glow:none` por padrão; cyberpunk adiciona glow). Regra: **glow não em texto** (só borda/sombra de elementos), para não reduzir legibilidade.
- **Badges de estado:** após tokens `--success/--warning/--err` (oklch claros do refined), conferir contraste do texto sobre `*-soft` (fundo translúcido) — usar a cor sólida no texto, fundo soft.
- **Regra de legibilidade admin/listas:** densidade `comfortable`, texto em `--fg-1/--fg-2`, evitar `--fg-4` em dados; linhas com `--bd-soft` (não invisível).

## Bloco 7 — Responsividade
| Área | Hoje | Risco no redesign |
|---|---|---|
| Sidebar (desktop) + Sheet (mobile) | `components/layout/sidebar.tsx`+`header.tsx` (hambúrguer→Sheet) | **Médio** — restilar sem quebrar o Sheet; manter largura `--sb-w` (232px Nexus) coerente. |
| MobileNav inferior | `mobile-nav.tsx` (5 atalhos fixos) | Baixo — restilar; cuidado p/ não duplicar com Sheet (já é COSMÉTICO conhecido). |
| Header | `header.tsx` (busca/sino/avatar) | Médio — adicionar **gatilho do SettingsDrawer** sem estourar em 360px. |
| Admin lists/tables | `admin/members` (lista divs), CRUDs | **Médio-alto** — telas densas no dark exigem contraste; testar 360/768px. |
| Forms | auth, admin composers, profile | Baixo — inputs restilados via token; checar foco/contraste. |
| Cards 3-col | dashboard/courses/resources/apps | Baixo — grid já responsivo (`sm:grid-cols-2 lg:grid-cols-3`). |
| Landing | `page.tsx` (hero 2-col) | **Alto** — maior redesenho; garantir hero empilha em mobile. |
**Rotas com maior risco mobile:** `/` (landing), `/admin/members` e CRUDs (densas), `/courses/[courseId]/lessons/[lessonId]` (player + nav).

## Bloco 8 — Performance / bundle
- **CSS Nexus:** `tokens.css` + `components.css` = ~ poucos KB; importados via `globals.css` (sem JS). Impacto **desprezível**.
- **0 dependências novas** (Geist já via next/font; **não** usar o `fonts.html`/Google CDN do Nexus — manteria a fonte atual e evita request externo).
- **Ilha client:** `ThemeProvider` (usa `useTweaks`) + `SettingsDrawer` adicionam **1** client component no shell. `useTweaks` só roda efeito (aplica `data-*` + localStorage). `useAccentHue/useDocumentTheme` usam `MutationObserver` — **só** instanciar se algum componente canvas precisar (provavelmente nenhum aqui) → **não** montar globalmente.
- **Anti-flash:** `BOOT_SCRIPT` inline no `<head>` (síncrono, ~0.3KB) aplica `data-*` antes do paint → evita flash claro→escuro. `suppressHydrationWarning` já no `<html>`.
- **Animações:** keyframes do Nexus (`spin/shimmer/toast-in/dot-pulse`) são leves (transform/opacity). Evitar glow animado em muitos elementos. **Sem** libs de animação novas.
- **Risco de hidratação:** manter o app majoritariamente RSC; o SettingsDrawer só hidrata quando aberto (estado local). Não envolver páginas inteiras em client.

---

## Bloco 9 — Checklist de regressão por rota (25 rotas)
Legenda esforço: B=baixo · M=médio · A=alto. "Invariante" = o que validar no antes/depois.

| Rota | Arquivo | Elementos | Esforço | Invariante a não regredir |
|---|---|---|---|---|
| `/` | `app/page.tsx` | hero 2-col, feature cards, cursos/posts destaque, CTA | **A** | links Entrar/Criar conta; hero empilha mobile; HC-8 |
| `/login` | `(auth)/login` + `login-form` | form email/senha + links | B | login funciona; erro legível |
| `/register` | `(auth)/register` + `register-form` | form 3 campos + alerta sucesso | B | sucesso "pending"; HC-4 |
| `/forgot-password` | `(auth)/forgot-password` + `forgot-form` | input email + msg sucesso | B | msg anti-enumeração |
| `/banned` | `app/banned/page.tsx` | card ShieldX + msg + Sair | B | **logout funciona**; não-banido → /dashboard |
| `/dashboard` | `(app)/dashboard` | saudação+progresso, atalhos, cursos/eventos/posts | **A** | progresso legível; empty states |
| `/community` | `(app)/community` | filtro+composer, lista, skeleton, empty | M | post cria/lista; skeleton |
| `/community/[postId]` | `community/[postId]` | back, PostCard, CommentList | B | comentar; voltar |
| `/courses` | `(app)/courses` | grid de cursos / empty | M | CourseCard (HC-6) |
| `/courses/[courseId]` | `courses/[courseId]` | progresso, módulos, aulas | M | check concluído HC-5; draft oculto p/ membro |
| `/courses/[courseId]/lessons/[lessonId]` | `.../lessons/[lessonId]` | player, markdown, anexo, prev/next | M | player HC-7; marcar concluída |
| `/resources` | `(app)/resources` | cards recurso + download / empty | M | botão download |
| `/apps` | `(app)/apps` | cards app + iframe embed + status | M | iframe; badges status |
| `/calendar` | `(app)/calendar` | lista eventos, badge tipo, RSVP | M | RSVP; passado `opacity-70` |
| `/leaderboard` | `(app)/leaderboard` | ranking, destaque do usuário (`bg-accent/40`) | M | usuário atual destacado |
| `/profile` | `(app)/profile` + `profile-form` | avatar, badges, ProfileForm | M | editar perfil salva |
| `/members/[userId]` | `members/[userId]` | perfil público (avatar/badges/pontos) | B | render público |
| `/notifications` | `(app)/notifications` | lista de notificações / empty | B | lista/empty |
| `/admin` | `admin/page.tsx` | 7 stat cards + próximos eventos | M | números corretos |
| `/admin/members` | `admin/members` + `member-row` | lista membros, **Owner protegido**, role/ban | M | **owner protegido**; role/ban via RPC |
| `/admin/courses` | `admin/courses` (+new/[id]/edit) | lista + form curso/módulo/aula | M | CRUD; badge status PT-BR (INC-4) |
| `/admin/resources` | `admin/resources` + actions | lista + composer + delete | M | CRUD |
| `/admin/apps` | `admin/apps` + actions | lista + composer + delete | M | CRUD (admin-only) |
| `/admin/events` | `admin/events` + actions | lista + composer + delete | M | CRUD |
| `/admin/settings` | `admin/settings` + `settings-form` | form config comunidade | B | salvar settings; `#0a0a0a` é dado |
> Rotas extra fora da lista de 25 mas existentes: `/admin/posts` (moderação) e boundaries `(app)/error`, `(app)/loading`, `not-found`, `global-error` (HC-10) — incluir no QA.

## Bloco 10 — Rollback visual
- **Toda a Fase 3 é visual e reversível por Git.** Sequência de **commits pequenos** (1 por sub-fase) permite `git revert` granular; a Vercel reimplanta o anterior.
- **Kill-switch de tema:** como tudo passa pelo bridge em `globals.css` + `data-*` no `<html>`, reverter = (a) `git revert` do commit do bridge, ou (b) trocar `<html data-theme="light">`/remover `data-style` para voltar ao visual claro sem reverter código.
- **Isolamento:** UI-1 (tokens/bridge) separada de UI-2..5 (shell/páginas) → se o tema "quebrar", reverte só UI-1 mantendo correções de hotspot.
- **Sem risco de dados:** nenhuma migration/RLS/Server Action tocada → rollback nunca afeta banco/produção de dados.
- **Sequência de commits sugerida:** `ui-1a copiar nexus assets` → `ui-1b token-bridge + dark-first` → `ui-1c fix hardcoded hotspots` → `ui-2 shell + SettingsDrawer` → `ui-3 landing/auth/banned/dashboard/members` → `ui-4 p2/p3` → `ui-5 QA/ajustes`.

## Matriz de comparação (UI atual × Nexus × estratégia)
| Área | UI atual | Nexus UI | Estratégia | Risco | Prioridade | Esforço |
|---|---|---|---|---|---|---|
| **Tokens globais** | oklch zinc light | tokens 3 eixos + accent hue | **bridge** em globals.css | Médio | P1 | M |
| **Landing** | zinc claro, MVP | — (criar com tokens/glow sutil) | redesenhar | Médio-alto | P1 | A |
| **Auth pages** | split zinc-950 | — | tokens + painel `--bg-inset` + accent | Baixo | P1 | M |
| **Banned** | card destructive | — | tokens (manter lógica) | Baixo | P1 | B |
| **Dashboard** | cards neutros | `.card`/badges/progress | tokens + realces accent | Médio | P1 | M |
| **Sidebar/Header** | shadcn padrão | `.drawer`, accent active | adaptar + gatilho SettingsDrawer | Médio | P1 | M |
| **Mobile nav** | barra fixa | — | restilar via token | Baixo | P1 | B |
| **Admin/members** | lista + Owner badge | `.badge`/`.btn` | tokens; **preservar Owner protegido** | Médio | P1 | M |
| **Community/feed** | cards/skeleton | `.card`/`.skeleton-line` | tokens + skeleton Nexus | Médio | P2 | M |
| **Courses/Lesson** | cards + player preto | `.card` | tokens + HC-5/6/7 | Médio | P2 | M |
| **Resources/Apps** | cards + iframe | `.card`/`.badge` | tokens | Baixo | P2 | M |
| **Calendar/Leaderboard** | listas | `.card`/`.badge`/`.dot` | tokens + destaque accent | Baixo | P2 | M |
| **Profile** | card + form | `.input` | tokens | Baixo | P3 | B |
| **Admin dashboard/CRUDs/Settings** | stat cards + forms | `.card`/`.input`/`.badge` | tokens + rótulos PT-BR | Médio | P3 | M |
| **Dialogs/Sheets** | overlay `bg-black/60` | `.drawer` | token `--overlay` (HC-1/2) | Baixo | P1 | B |
| **Badges** | semânticos + emerald/amber | `.badge--ok/warn/err/accent` | tokens `--success/--warning` (HC-3) | Baixo | P1 | B |
| **Forms** | shadcn inputs | `.input/.select` | tokens (focus accent) | Baixo | P2 | B |
| **Toasts** | sonner richColors | `.toast` | manter sonner, alinhar cores ao token | Baixo | P3 | B |
| **Empty states** | `EmptyState` (desigual) | `.empty` | padronizar + tokens | Baixo | P3 | B |
| **Error/loading/404/global-error** | neutros + hex inline | `.spin`/`.empty` | tokens + HC-10 | Baixo | P3 | B |

---

## Caminhos de incorporação (A/B/C/D)
- **A — Leve:** só tokens/cores/cards/botões/bg. Risco mínimo, impacto identitário menor (não redesenha landing/shell). 
- **B — Média:** tokens + shell + landing/auth/dashboard. Risco moderado.
- **C — Profunda faseada (ESCOLHIDA):** design system + shell + todas as páginas P1/P2/P3 + admin, **em fases** com QA e rollback por commit. Maior identidade com risco controlado.
- **D — Reescrita completa:** **não recomendada** (jogaria fora shadcn/acessibilidade já prontos; alto risco).
**Recomendação técnica:** **C**, executado **token-first** (UI-1 cascateia ~75-80% antes de tocar página por página). Ordem: design system → shell → P1 → P2/P3.

## Arquitetura recomendada (hipótese VALIDADA, com 1 ajuste)
A hipótese do dono está **correta**. Ajustes/confirmações:
1. **Copiar** para dentro do app: `src/styles/nexus/{tokens.css,components.css}` e `src/components/nexus/{theme.tsx,SettingsDrawer.tsx,primitives.tsx,Icon.tsx}` (`"use client"` em `theme.tsx`+`SettingsDrawer.tsx`; primitives/Icon RSC-safe).
2. **NÃO** importar `base.css` inteiro → cherry-pick **scrollbar**, **`::selection`**, **`:focus-visible`** para o `@layer base` do `globals.css`.
3. **Token-bridge** em `globals.css`: importar `tokens.css`+`components.css` após `@import "tailwindcss"`; aliasar **todas** as vars shadcn → Nexus; **adicionar** `--success/--warning/--overlay/--video-bg`.
4. **shadcn permanece a base**; primitivos Nexus pontuais (Toggle/SettingsDrawer; Icon onde lucide não cobrir).
5. **`<html>` dark-first** em `layout.tsx`: `data-theme="dark" data-style="refined" data-density="comfortable"` + `BOOT_SCRIPT` inline no `<head>`.
6. **Glow/glass com moderação**; glow = token `--glow` (refined: none; usar sombra accent sutil em realces). Glass/mesh, se usados, CSS custom leve só em hero/landing.
7. **Correção dos hotspots** HC-1..HC-10 (Bloco 5) — junto da UI-1.

## Proposta de design system — Portal Nexus (refined-dark + neon controlado)
- **Base/estilo:** `data-style="refined"` (dark Linear/Raycast). **Accent default:** cyan **hue 200** (`ACCENT_PRESETS`: cyan 200 · roxo 300 · verde 145 · vermelho 25 — disponíveis no toggle).
- **Fundo:** `--bg-app oklch(0.17…)` (quase-preto grafite-azulado); painéis `--bg-pane`; cards `--bg-card/--bg-elev`; inset `--bg-inset` (vídeo/áreas fundas).
- **Texto:** `--fg-1` (títulos/corpo), `--fg-2` (secundário), `--fg-3` (muted), `--fg-4` (só meta). 
- **Cards:** `--bg-pane/card` + `1px var(--bd-soft)`, `--radius` 12px, sombra `--shadow-1` discreta; realce de card ativo com `--accent-line`.
- **Botões:** primário = `--accent`/`--accent-fg` (+ `--glow` sutil); secundário = `--bg-card`/`--bd-soft`; destrutivo = `--err`. (shadcn variants restiladas via tokens.)
- **Inputs:** `--bg-card` + `--bd-soft`; **focus** = `--accent-line` (ring accent).
- **Badges:** estado via `--success/--warning/--err/--accent` (texto sólido sobre fundo `*-soft`). Role/level badges em accent/neutro.
- **Sidebar/Header:** sidebar `--bg-pane` + borda `--bd-line`; item ativo com barra/fundo `--accent-soft` + texto `--accent`; header com gatilho do SettingsDrawer (ícone Nexus). 
- **Focus ring:** global `:focus-visible` accent (cherry-pick base.css) + `ring` shadcn.
- **Toasts:** manter **sonner**, alinhar cores (`richColors`) aos tokens success/err/warn.
- **Estados:** sucesso `--success`, alerta `--warning`, erro `--err` (com `-soft` de fundo).
- **Glass:** opcional só em hero/landing (blur + borda accent translúcida) — **não** em listas densas.
- **Glow:** moderado, **nunca em texto**; só borda/sombra de elementos de destaque (CTA, card ativo).
- **Regra de legibilidade (admin/listas):** densidade `comfortable`, dados em `--fg-1/--fg-2`, linhas `--bd-soft` visíveis, zero glow, contraste ≥ 4.5:1.

## Páginas prioritárias
- **P1:** Landing · Login/Register/Forgot · **Banned** · Dashboard · Sidebar/Header/MobileNav · Admin/members.
- **P2:** Community/feed · Courses · Lesson · Resources · Apps · Calendar · Leaderboard.
- **P3:** Admin geral · Admin CRUDs · Settings · Profile · Notifications · Error/loading/404/global-error.

## Plano localhost (UI-0..UI-5)
- **UI-0 (este doc)** ✅ — auditoria, sem alteração visual.
- **UI-1 Design system:** copiar nexus → `src/styles/nexus` + `src/components/nexus`; bridge + dark-first + `BOOT_SCRIPT`; cherry-pick base; **HC-1..HC-10**. `pnpm typecheck/lint/build`. Commits: `ui-1a/1b/1c`.
- **UI-2 Shell:** sidebar/header (+SettingsDrawer)/mobile-nav/`(app)/layout`/`admin/layout`.
- **UI-3 P1:** landing, auth, banned, dashboard, admin/members (**preservar Owner protegido**).
- **UI-4 P2/P3:** community/courses/lesson/resources/apps/calendar/leaderboard/profile/notifications/admin CRUDs/settings/boundaries.
- **UI-5 QA local:** `pnpm typecheck/lint/build` + `pnpm dev` rodando a checklist das 25 rotas + a11y/contraste/mobile + toggle tema/accent + console limpo.

## Riscos (e mitigação)
| Risco | Mitigação |
|---|---|
| `base.css` reset global vs preflight | **não importar**; cherry-pick 3 regras. |
| Bridge incompleto quebra componente | mapear **todas** as vars shadcn + `--success/--warning/--overlay/--video-bg`; build após. |
| Contraste/legibilidade dark em telas densas | regra de legibilidade + QA por rota (Bloco 6/9). |
| Flash claro→escuro | `BOOT_SCRIPT` no `<head>` + `suppressHydrationWarning`. |
| Quebra de invariante (owner/ban/auth) | **não** tocar lógica; QA dos invariantes (Bloco 0). |
| Hidratação extra | ThemeProvider só no shell; SettingsDrawer hidrata sob demanda. |
| Naming CODEX×Portal Nexus | alinhar copy na UI-3 (decisão de marca do dono). |

## Critérios de aceite (Fase 3 completa)
1. `pnpm typecheck/lint/build` verdes. 2. 25 rotas renderizam sem erro de console. 3. Invariantes do Bloco 0 preservados (auth, /banned+logout, owner protegido, gates, mobile). 4. Contraste ≥ 4.5:1 (texto principal) no refined-dark; foco visível. 5. Toggle de tema/estilo/accent funciona e persiste (localStorage), sem flash. 6. 0 dependências novas. 7. Nenhum arquivo removido; nenhuma migration/RLS/Server Action/permite tocada. 8. Rollback por commits pequenos disponível.

## Recomendação final
**APROVADO PARA IMPLEMENTAR UI-1** — arquitetura token-first validada, 0 deps, risco médio mitigável, reversível por commit. Iniciar por `ui-1a` (copiar nexus) → `ui-1b` (bridge + dark-first) → `ui-1c` (hotspots), rodar build/lint/typecheck e revisar em localhost **antes** de avançar para UI-2. Tudo em localhost; **sem deploy** até seu aval do resultado visual.

*Documento UI-0 gerado em 2026-06-14. Nenhum código de UI foi alterado nesta etapa.*
