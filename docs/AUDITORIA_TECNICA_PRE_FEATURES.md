> ⚠️ **HISTÓRICO — não usar como estado atual.** Achados deste documento podem já ter sido corrigidos (ex.: award_points, cursos draft, estorno de pontos — resolvidos nas migrations 0010/0031/0032/0035). Estado vigente: docs/AUDIT_POST_RELEASE_*.md (2026-07-08).

# AUDITORIA TÉCNICA PRÉ-FEATURES — Portal Nexus (módulo COMUNIDADE)

> **Tipo:** Auditoria técnica read-only — **nenhum arquivo de código, banco, migration, Supabase, commit, push ou deploy foi tocado**. Únicos arquivos criados: este documento e o resumo (`AUDITORIA_TECNICA_PRE_FEATURES_RESUMO.md`).
> **Data:** 2026-06-30 · **Módulo:** `COMUNIDADE/` (package `codex-community`) · **Branch:** `master` · **HEAD:** `df23feb` (working tree limpo).
> **Stack:** Next.js 16.2.6 (App Router, `proxy.ts` no lugar de `middleware.ts`) + React 19.2.4 + TypeScript estrito + Tailwind CSS 4 + shadcn/ui + Supabase (Auth/Postgres/Storage/RLS) + Vercel + pnpm.
> **Método:** leitura direta (`arquivo:linha`) + bateria estática real (`typecheck`/`lint`/`build`) + 6 agentes especializados read-only + verificação adversarial independente dos achados críticos pelo agente consolidador.

---

## 1. Resumo executivo

O módulo COMUNIDADE chega à fase pré-features em **estado técnico saudável e maduro para um MVP em produção**. As três varreduras estáticas obrigatórias passam limpas (`typecheck`, `lint`, `build` — todas **exit 0**), a arquitetura App Router/RSC/Server Actions é sólida e proporcional, e — ponto mais importante — **os dois achados CRÍTICOS da auditoria-baseline anterior (2026-06-14) estão fechados no código**, o que foi verificado de forma independente nesta auditoria:

- **SEC-01** (auto-unban / fraude de pontos via PostgREST) → **fechado** pela migration `0009` (`revoke update … from authenticated` + `grant update (full_name, username, bio, avatar_url)`; colunas `role`/`is_banned`/`points`/`level`/`is_owner` deixaram de ser graváveis pelo usuário comum).
- **SEC-03** (vazamento de aulas de cursos `draft`) → **fechado** pela migration `0010` (policies de `lessons`/`course_modules` agora exigem curso `published` OU moderador).
- Extras já implementados e confirmados: owner absoluto protegido por RLS+RPC (não só UI), gestão de role/ban via RPC `SECURITY DEFINER` transacional (corrige o TOCTOU SEC-05), `markLessonComplete` validando aula↔curso (SEC-08), `getUser()` em toda checagem, service-role isolado em módulo `server-only`, validação anti-SSRF de avatar/social_links, CSP/HSTS fortes, e banido bloqueado em escrita em 3 camadas.

**Não há nenhum achado CRÍTICO de código no estado atual.** Os bloqueadores reais que restam são **operacionais e não-verificáveis por código** (exigem o Dashboard Supabase / painel Vercel), e por isso entram como **P0 de verificação**, não como correção de código:

1. **Confirmar que a cloud de produção tem as migrations 0008–0012 aplicadas.** O arquivo `supabase/_setup_cloud.sql` está **congelado em 0007** (não contém `is_owner`, `social_links`, `post_reactions`, `admin_set_role` nem os fixes de SEC-01/SEC-03). Se a cloud foi (re)provisionada por esse arquivo, ela está **sem os fixes de segurança e o app quebra em runtime**.
2. **Confirmar/neutralizar o backdoor demo.** `seed.sql`/`_seed_cloud.sql` criam `admin@codex.community` com a senha pública `codex123!`. Se aplicado na cloud que está no ar, é um admin real com senha pública.
3. **Fixar uma única fonte da verdade de deploy.** Coexistem Vercel (oficial) e uma stack Hetzner/Docker/Caddy + `deploy.yml` (SSH) ainda ativos no repositório.

Fora isso, a dívida é **rasa e localizada**: ~7 dependências instaladas e nunca importadas (incluindo `react-hook-form` e `@tanstack/react-query`, que o README ainda lista como stack central), rate-limit in-memory ineficaz sob serverless, um bug de contador otimista de like no clique duplo, perda de tipagem na borda do Supabase (consequência do `db.ts` stub) e documentação parcialmente desatualizada (marca CODEX×Nexus, "7 migrations" vs 12 reais, "sem testes" vs suíte Playwright presente).

**Decisão: `APROVADO COM CORREÇÕES P0/P1`.** O código está pronto para iniciar features assim que os P0 (verificações operacionais) forem confirmados e os P1 (curtos, baixo risco) endereçados. Detalhe na §17 e §19.

### Contagem de achados por severidade (após calibração adversarial)

| Severidade | Qtd | Observação |
|---|:---:|---|
| **CRÍTICO** | **0** | (no estado atual do código) |
| **ALTO** | **3** | SEC-DEMO (condicional), E-1 (`_setup_cloud` defasado), F-15 (deploy Hetzner ativo — condicional) |
| **MÉDIO** | **15** | rate-limit serverless, like-stale, db.ts/borda Supabase, deps mortas, paginação, a11y, deploy divergente, doc-sync, etc. |
| **BAIXO** | **24** | endurecimentos, limpeza, consistência |
| **COSMÉTICO** | **9** | naming, keys estáticas, verbosidade |
| **POSITIVO (verificações que passaram)** | **~20** | SEC-01/03 fechados, owner protegido, CSP, service-role isolado, otimismo isolado, tema sem FOUC, etc. |

---

## 2. Escopo

**Em escopo:** todo o módulo `COMUNIDADE/` — código-fonte (`src/`), `proxy.ts`, migrations (`supabase/migrations/0001..0012`), seeds, `config.toml`, configuração (`next.config.ts`, `tsconfig.json`, `eslint`, `tailwind`/`postcss`), infraestrutura (`Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.github/workflows/`, `scripts/`), testes (`e2e/`), assets (`public/`) e documentação (`docs/`, `README.md`, `CLAUDE.md`, `AGENTS.md`).

**Fora de escopo (limitações declaradas):**
- **Estado real do banco/Auth na Supabase cloud** — não inspecionado (sem acesso ao Dashboard). Por isso SEC-DEMO e a aplicação das migrations 0008–0012 ficam como **verificação P0**, não como afirmação.
- **Plataforma de deploy ao vivo (Vercel/Hetzner)** — não inspecionada. Divergência de infra avaliada só pelos artefatos no repo.
- **Execução da suíte E2E** — `pnpm test:e2e` **não foi rodado** (exigiria subir app + Supabase). A suíte foi avaliada por leitura.
- **`.env.local`** — não lido (segredos); inventário de env feito por referências no código.

**Regra honrada:** etapa exclusivamente de auditoria. Nenhuma correção implementada, nenhuma migration criada, nenhum SQL executado, nenhum commit/push/deploy, nenhuma dependência instalada, nenhum arquivo de código modificado ou formatado.

---

## 3. Agentes e skills selecionados

Foram selecionados **6 agentes especializados read-only** com responsabilidades disjuntas + **1 consolidador/adversarial** (o agente principal). Nenhum agente recebeu permissão de escrita de código; todos foram instruídos a apenas ler/grep/analisar e retornar achados estruturados.

| # | Agente (subagent_type) | Responsabilidade (sem sobreposição) | Prefixo |
|---|---|---|---|
| A | `Architect` (Read/Glob/Grep) | Arquitetura Next 16/RSC, camadas de autorização, **sobreposições**, server/client boundaries, organização actions/queries | `A-` |
| B | `security-engineer` | **Segurança**: RLS, Auth, Storage, owner/ban, segredos, rate-limit, exposição de env | `B-` |
| C | `code-reviewer` | **TypeScript, bugs, tipagem fraca**, concorrência, hooks, validação client/server | `C-` |
| D | `frontend-developer` | **Frontend, a11y, desempenho**, tema Nexus, estados de UI, bundle | `D-` |
| E | `general-purpose` | **Banco, migrations, modelagem**, índices, N+1, paginação, triggers | `E-` |
| F | `general-purpose` | **Legacy, duplicação, overcoding, dependências**, infra, assets, naming | `F-` |
| — | **Consolidador/Adversarial** (agente principal) | Baseline, leitura de docs, dedup, contestação de falsos positivos, verificação independente dos CRÍTICOs, classificação e relatório | — |

**Por que esse desenho:** evita os anti-padrões de "dezenas de agentes na mesma área". As únicas fronteiras que tocam os mesmos arquivos (B e E em `supabase/`) foram separadas por eixo — **B = semântica de segurança** (quem-pode-o-quê, vazamento), **E = estrutura/eficiência** (schema, índices, idempotência, N+1). Paralelismo usado onde há ganho real (os 6 rodaram concorrentes). Skills de UI/design (frontend-design, ui-ux-pro-max, etc.) **não** foram usadas — são para construção, não auditoria.

---

## 4. Metodologia

1. **Baseline (Fase 0):** `git status`/`log`, `package.json`, árvore de `src/`, rotas, e bateria estática real (`pnpm typecheck` / `lint` / `build`).
2. **Documentação:** leitura integral de `README.md`, `CLAUDE.md`, `AGENTS.md`, e `docs/` (PROJETO, PLAYBOOK, PRODUCAO, AUDITORIA_BASELINE, FASE_1_PRODUCAO_SEGURA, FASE_3_UI_RELEASE, UI_NEXUS_AUDIT). Comparação doc↔código — **o código e o comportamento atual são o baseline técnico**; divergências registradas.
3. **Fan-out:** 6 agentes especializados em paralelo, cada um com brief preciso (arquivos-alvo, blocos de auditoria, formato de saída padronizado, regras anti-overcoding).
4. **Coleta estruturada:** cada agente devolveu tabela compacta (ID, título, categoria, severidade, confiança, `arquivo:linha`, comportamento, impacto, recomendação mínima, esforço) + nota 0-10 da sua dimensão + verificações que passaram (POSITIVO).
5. **Revisão adversarial (consolidador):** verificação **independente** dos achados de maior risco lendo os próprios arquivos:
   - `0009`/`0010`/`0012` → confirmado que SEC-01/SEC-03 estão fechados e a RLS de reactions é correta.
   - `seed.sql` / `_setup_cloud.sql` → confirmado backdoor demo e congelamento em 0007.
   - `git ls-files` → confirmado `vercel.txt` trackeado; **corrigido o HEAD** (real `df23feb`, não `495ec35` como um agente reportou).
   - grep de imports → confirmadas as dependências mortas (`react-hook-form`, `@tanstack/react-query`, `date-fns`, 3 Radix) contra a documentação.
6. **Calibração de severidade:** rebaixados achados super-avaliados (ver §18), removidos falsos positivos, validada a proporcionalidade de cada recomendação (nenhuma cria overcoding).
7. **Classificação e priorização:** P0/P1/P2/P3/Não-agir.

---

## 5. Baseline (estado a não regredir)

### 5.1 Bateria estática (executada de verdade, read-only)

| Check | Comando | Resultado |
|---|---|:---:|
| Typecheck | `pnpm typecheck` (`tsc --noEmit`) | ✅ **exit 0** |
| Lint | `pnpm lint` (`eslint`) | ✅ **exit 0** (CI-01 do baseline anterior — `cookie-consent` — está corrigido) |
| Build | `pnpm build` (`next build`, Turbopack) | ✅ **exit 0** — 32 rotas |
| Build (warning) | — | ⚠️ `[env] NEXT_PUBLIC_APP_URL aponta para localhost em produção` (guard em `lib/env.ts`) |
| Git | `git status` | working tree **limpo**, `master`, HEAD `df23feb` |
| E2E | `pnpm test:e2e` | **não executado** (fora de escopo; suíte existe em `e2e/`) |

### 5.2 Inventário

- **Stack/versões:** Next 16.2.6, React 19.2.4, TS 5, Tailwind 4, Supabase JS 2.106 / SSR 0.10, Zod 4.4, Sentry 10.57, Sonner, lucide-react. 131 arquivos `.ts/.tsx` em `src/`, 49 componentes, 6 Server Actions, 3 módulos de query, 12 migrations.
- **Rotas (build):** públicas estáticas `/`, `/login`, `/register`, `/forgot-password`, `/termos`, `/privacidade`; dinâmicas (ƒ) todas as `(app)` e `admin/*` + `/api/health`, `/auth/callback`, `/banned`.
- **Camadas de autorização:** `proxy.ts` (borda: auth + gate `/admin`) → layouts `(app)`/`admin` (`requireActiveProfile`/`requireAdmin`) → Server Actions (`require*` + Zod) → RLS Postgres (`is_admin`/`is_moderator`/`is_not_banned`/`is_owner`).
- **Papéis:** `member`/`moderator`/`admin` (enum) + flag ortogonal `is_owner`. Owner mantém `role='admin'`, ganha imunidade.
- **Tabelas (19):** profiles, communities, community_members, posts, post_comments, post_likes, **post_reactions** (0012), courses, course_modules, lessons, lesson_progress, lesson_comments, resources, apps, events, event_attendees, points_ledger, notifications, settings.
- **Storage (6 buckets):** avatars, post-media, videos, resources, apps, course-covers.
- **Env esperadas:** `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), `NEXT_PUBLIC_APP_URL`, `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN` (opcional).

### 5.3 Fluxos que NÃO podem regredir (invariantes)

Cadastro · confirmação de email · login · recuperação de senha · logout · owner protegido (`/admin/members`) · banido→`/banned` · membro comum barrado em `/admin` · edição de perfil · upload de avatar · links sociais · CRUD/fixar/reagir em posts · acesso a cursos (draft oculto p/ membro) · recursos · apps · eventos/RSVP · pontos/ranking idempotentes. Todos verificados por leitura como **íntegros** no código atual.

---

## 6. Inconsistências

Divergências com evidência. Regra: código/comportamento atual = baseline; a inconsistência é registrada para correção de doc ou alinhamento.

| ID | Inconsistência | Evidência | Severidade |
|---|---|---|---|
| INC-1 | **Deps listadas como stack central, mas mortas** | README.md:26,47 lista "React Hook Form" e "TanStack Query"; grep em `src/` → **0 imports** de `react-hook-form`, `@hookform/resolvers`, `@tanstack/react-query`. Forms usam FormData nativo + Zod + Server Actions. | MÉDIO |
| INC-2 | **"7 migrations" / 6 buckets vs 12 migrations / 19 tabelas** | README.md:93, PROJETO.md:234,723 ("7 SQLs", "18 tabelas", "schema bate 100%"); reais: 12 migrations (0001–0012), 19 tabelas. Auditoria interna do doc é de 2026-05-31, anterior a 0008–0012. | MÉDIO |
| INC-3 | **"Sem testes automatizados" vs suíte Playwright presente** | README.md:276 "Sem testes automatizados"; reais: `e2e/*.spec.ts` (public/member/admin) + `playwright.config.ts` + script `test:e2e`. | MÉDIO |
| INC-4 | **Marca CODEX vs Portal Nexus** | UI já migrada (`layout.tsx:19` "Portal Nexus", landing "Nexus"); resíduos: `package.json:2` `codex-community`, `api/health/route.ts:9` `name:"CODEX Community"`, README/PROJETO/PLAYBOOK inteiros como "CODEX Community". | BAIXO |
| INC-5 | **Deploy Vercel (docs/Fase 1) vs infra Hetzner/Docker ativa** | FASE_1:4 "Deploy oficial: Vercel"; mas `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.github/workflows/deploy.yml:1` "Deploy (Hetzner)" presentes e o `deploy.yml` dispara em push. | MÉDIO |
| INC-6 | **`NEXT_PUBLIC_APP_URL=localhost` no template** | README.md:182 e `.env.example` usam `http://localhost:3004`; `lib/env.ts` emite warning em build (visto na §5.1). Em prod sem a env correta, e-mails de confirmação/reset quebram. | MÉDIO |
| INC-7 | **`api/health` retorna porta/marca fixas** | `api/health/route.ts:9,11` devolve `name:"CODEX Community"` e `port:3004` fixos ao HUB; Dockerfile usaria 3000. Healthcheck mente sob outra porta/marca. | BAIXO |
| INC-8 | **PLAYBOOK propaga credenciais públicas e project-ref** | PLAYBOOK.md:11 manda logar com `admin@codex.community`/`codex123!`; PLAYBOOK.md:27 expõe URL do projeto `yagjnowggkqvjrnysihi`. | BAIXO |
| INC-9 | **Stub `db.ts` diz "queries continuam tipadas"** | `db.ts` comentário afirma type-safety, mas `Insert/Update: any` e joins reconstruídos com casts `as` na camada de queries (C-7). | BAIXO |
| INC-10 | **Nota de contexto "não é mais repo git" vs repo git ativo** | `COMUNIDADE/.git` existe, HEAD `df23feb`, com `vercel.txt`/`seed.sql` trackeados. (Memória do agente dizia o workspace raiz não ser git — o submódulo COMUNIDADE é.) | BAIXO |

---

## 7. Duplicações

Distinguidas em: **prejudicial** (corrigir), **aceitável** (manter), **abstração prematura** (NÃO criar).

| ID | Padrão | Locais / Evidência | Classificação | Ação |
|---|---|---|---|---|
| A-11 | **Botões "delete inline"** quase idênticos | `admin/posts/{delete,purge}-post-inline.tsx` + `resources/resource-actions.tsx` + `events/event-actions.tsx` + `apps/app-actions.tsx` (4–5×) | **Prejudicial (leve)** | Extrair UM `DeleteActionButton` parametrizado pela action. **Não** generalizar p/ CrudKit. Esforço M, P2. |
| F-10/D-7 | **`confirm-dialog.tsx`** órfão duplica `ConfirmDeleteIconButton` | grep `ConfirmDialog` → 0 imports; `ConfirmDeleteIconButton` usado 6× | **Prejudicial (morto)** | Remover o arquivo. Esforço P, P2. |
| A-6 | **Tipo de retorno de action triplicado** (`ActionState`/`ActionResult`/`Result`) | `auth.ts:11`, `posts.ts:14`, `courses.ts:10` + 4× `Result` | **Prejudicial (leve)** | Extrair `src/lib/types/actions.ts` único. Esforço P, P2. |
| (M3/DUP-1) | **Composers admin** (`useState(form)+update<K>+FormData`) repetidos 5× | admin courses/apps/events/resources + settings-form | **Abstração prematura** | **NÃO** criar `useFormComposer` agora — os forms divergem o suficiente; ganho de linhas não reduz complexidade líquida. |
| F-20 | Badges role/level/category | role-badge 4×, level-badge 6×, category-badge 2× (só compartilham `ui/badge`) | **Aceitável** | Manter os 3. Unificar aumentaria complexidade. |
| F-21/F-22 | Avatares em camadas + upload | `ui/avatar`→`user-avatar`→`avatar-uploader`; `avatar-uploader`/`post-image-field` chamam `useImageUpload` | **Boa fatoração** | Manter (fonte única já existe). |
| F-23/F-24 | Zod e permissões centralizados | `schemas.ts` (5 actions), `policies.ts` (6 arquivos) | **Boa fatoração** | Manter. |
| F-25 | `error.tsx` por segmento (3×) | Next exige 1 por segmento; textos distintos | **Aceitável** | Manter; extrair não reduz complexidade líquida. |

---

## 8. Sobreposições

| ID | Sobreposição | Evidência | Classificação | Ação |
|---|---|---|---|---|
| A-1 | Gate de admin no **proxy** e no **layout** admin | `proxy.ts:66-85` + `admin/layout.tsx:19` | **Defesa em profundidade válida** | Manter; documentar proxy como fast-path. Não unificar. |
| A-12 | `markLessonComplete`/`getLessonForViewer` reimplementam o gate "curso visível" que a RLS já faz | `courses.ts:116-132` + `queries/courses.ts:88-96` (comentário SEC-03) | **Defesa em profundidade válida** | Manter. Se virar gargalo, **fundir** no SELECT principal via join — não remover a camada. |
| A-2 | **Gate de banido em leitura só no layout `(app)`**; páginas usam `requireProfile` (helper fraco) em vez de `requireActiveProfile` | `(app)/layout.tsx:8` vs `dashboard/page.tsx:36`, `community/page.tsx:21` etc. | **Complexidade frágil (armadilha latente)** | Padronizar páginas para `requireActiveProfile()` (custo zero via `cache()`). Hoje inofensivo; rota futura fora de `(app)` não herdaria o bloqueio. Esforço P, **P1**. |
| A-5 | **Três estilos de autz de mutação** nas actions (redirect via `require*` / `{ok,error}` via policy / exceção via RPC) | `resources-apps-events.ts:15` vs `posts.ts:67` vs `admin.ts:35` | **Redundância aceitável (inconsistência)** | Documentar a regra; **não** criar wrapper genérico. Esforço M, P2. |
| E-7 | **Dois sistemas de pontuação de like** (trigger SQL vs action) | trigger `handle_like_award` (`0005:93`) dá +2; `togglePostLikeAction` (`posts.ts:155-157`) **não** chama awardPoints (proposital) | **Defesa em profundidade válida (sem duplicar hoje)** | Manter; comentar que o valor "2" é espelhado em `constants.ts:82` p/ evitar dupla-contagem futura. |
| B-6 | `profiles_select_all` expõe `is_banned`/`role`/`points`/`is_owner` de terceiros | `0006:8-11`; lido em `members/[userId]`, `leaderboard` | **Redundância aceitável / risco conhecido** | Sem PII sensível (email/senha vivem em `auth.users`). Opcional: VIEW `public_profiles` com subset. Esforço M, **P3**. |

**Múltiplas fontes de verdade (registradas):** valor de pontos do like (trigger SQL × `constants.ts`); thresholds de nível (`recalc_level` SQL × dead `levelFromPoints` removido na prática); tema (resolvido — fonte única no motor Nexus, sem conflito — A-10/D P-1).

---

## 9. Arquivos legacy

Classificação: **manter / adaptar / arquivar / remover-futuramente / confirmar-manualmente / não-remover**. Nenhuma remoção recomendada sem evidência de 0 usos (grep).

| ID | Item | Evidência (0 usos confirmados por grep onde aplicável) | Classificação |
|---|---|---|---|
| F-15 | `.github/workflows/deploy.yml` "Deploy (Hetzner)" SSH+docker, dispara em push | `deploy.yml:1`; produção é Vercel | **arquivar/desabilitar** (ver §13 — condicional ALTO) |
| F-14 | `Dockerfile`, `docker-compose.yml`, `Caddyfile`, `.dockerignore` (self-host Hetzner) | `next.config` standalone só com `DOCKER_BUILD=1` | **confirmar-manualmente** → arquivar se Vercel é definitiva |
| F-5 | `@tanstack/react-query` instalado, **0 imports** | grep `react-query/QueryClient/useQuery` → 0 | **remover-futuramente** |
| F-6 | `react-hook-form` + `@hookform/resolvers`, **0 imports** | grep `react-hook-form/useForm/hookform` → 0 | **remover-futuramente** |
| F-7 | `date-fns`, **0 imports** (datas via `Intl`) | grep `date-fns` → 0 | **remover-futuramente** |
| F-8 | Radix `radio-group`/`toast`/`tooltip` órfãos | grep → 0 (toasts via `sonner`) | **remover-futuramente** |
| F-9 | shadcn `checkbox`/`popover`/`scroll-area`/`switch` nunca instanciados | grep `<Checkbox/<Popover/<ScrollArea/<Switch` → só o próprio `.tsx` | **remover-futuramente** (+ Radix associados) |
| F-10 | `confirm-dialog.tsx` órfão | grep → 0 imports | **remover-futuramente** |
| F-11 | 5 SVGs boilerplate do create-next-app (`file/globe/next/vercel/window.svg`) | grep em `src/` → 0 refs cada | **remover-futuramente** |
| F-12 | `NEXUS LOGO.png` na raiz (duplica `public/nexus-logo.png`, byte-idêntico) | grep "NEXUS LOGO" → 0 refs | **arquivar** |
| F-13 | `dev-server.log` versionado (não coberto pelo `.gitignore`) | `.gitignore` cobre `*.tsbuildinfo`/`vercel.txt`, não `dev-server.log` | **adaptar** (.gitignore `*.log`) |
| F-17 | `scripts/verify-fase1.mjs` (específico de fase) / `test-connection.mjs` (válido) | refs em docs | **confirmar-manualmente** (arquivar verify-fase1 ao fechar Fase 1) |
| F-1/F-2 | naming `codex-community` em `package.json:2` e `api/health` | intencional p/ HUB (`api/health`) | **confirmar-manualmente** (alinhar com HUB) |
| F-16/F-18/F-19 | `ci.yml` (typecheck/lint/build), `backup.sh`, `.nvmrc=20` | corretos/agnósticos | **manter** |
| `_setup_cloud.sql` | Congelado em 0007 (E-1) | grep `is_owner/social_links/post_reactions/admin_set_role` → 0 | **adaptar/remover** (ver §13) |

**Marca já migrada (positivo, F-3):** a superfície visível (landing, layout, logo, auth, legal) já usa "Nexus"/"Portal Nexus". O legacy de naming é só metadado/contrato HUB/credenciais demo.

---

## 10. Bugs e tipagem fraca

Todos confirmados por `arquivo:linha`. `tsc` e ESLint passam — estes são problemas que **passam pelo compilador** mas continuam frágeis em runtime.

| ID | Título | Sev | Conf | Evidência | Comportamento / Impacto | Correção mínima |
|---|---|:---:|---|---|---|---|
| C-1 | Contador de like com valor stale no clique duplo | MÉDIO¹ | confirmada | `post-card.tsx:66-78` | Read-modify-write lê `liked` capturado; duplo clique soma na direção errada. **Transitório — revalida no reload** | Derivar delta dentro do updater funcional de `setLiked` |
| C-5 | Toggle like/reação read-modify-write sem atomicidade | MÉDIO | alta | `posts.ts:144-158,177-193` | 2 requests concorrentes → erro cru de `unique` (23505) ou toggle incoerente | `upsert`/delete idempotente ou tratar 23505 como no-op |
| C-6 | Erro cru do Postgres vaza ao usuário | MÉDIO | confirmada | `posts.ts:42`; `courses.ts:29,48`; `resources-apps-events.ts:31`; `profile.ts:35` | `error.message` do PostgREST devolvido direto na UI (vaza schema; inconsistente com `admin.ts` que já mapeia) | Mapear erros conhecidos + genérico (`friendlyAdminError`) |
| C-7 | Perda de tipagem na borda Supabase (causa-raiz: `db.ts` stub) | MÉDIO | confirmada | `queries/posts.ts:67,104-132`; `db.ts:245-285` | Joins viram `Record<string,unknown>` + dezenas de casts `as`; drift de schema não acusa em compilação | Validar shape do join com Zod por query, ou gerar `db:types` reais |
| C-2 | `getCurrentProfile` ignora `error` e faz cast `as Profile` | MÉDIO | confirmada | `current-user.ts:22-28` | Falha de leitura vira `null` → ejeta usuário logado p/ `/login` (logout aparente em soluço de banco) | Desestruturar `error`; distinguir erro de "sem perfil" |
| C-3 | `LessonPage` não valida lesson↔courseId | MÉDIO | alta | `lessons/[lessonId]/page.tsx:13-22` | Aula de curso B abre sob courseId A; estado impossível navegável | `.eq("course_id", courseId)` ou `notFound()` |
| C-4 | Hydration mismatch em `useTweaks` | MÉDIO | alta | `theme.ts:36-37` | `useState` lê `localStorage` no initializer; SSR usa defaults (contido pelo BOOT_SCRIPT) | Inicializar com defaults + hidratar em `useEffect` |
| C-9 | RSVP com `going` stale (duplo clique) | BAIXO | confirmada | `rsvp-button.tsx:13-23` | Mesma classe de C-1; estabiliza no reload | `setGoing((g)=>!g)` |
| C-11 | Rate-limit contornável via `x-forwarded-for` forjado | BAIXO² | alta | `rate-limit.ts:34-38` | XFF confiável sem proxy à frente → limite de auth burlável | Garantir proxy sobrescreve XFF / usar IP da conexão |
| C-8 | `markLessonComplete`: toast "+15" mesmo em re-marca | BAIXO | média | `courses.ts:134-148` | Pontos não duplicam (idempotente) mas o toast mente | Propagar flag "pontuou agora" ao toast |
| C-10/C-17/C-19 | `error` do Supabase/`getUser`/`awardPoints` descartado | BAIXO | confirmada | `queries/posts.ts:71-83`; `current-user.ts:9-13`; `posts.ts:44,233` | Falhas silenciosas (contagens zeradas, pontuação perdida) sem diagnóstico | Log estruturado (sem vazar env) |
| C-12 | `updatePostAction` aceita update vazio | BAIXO | média | `posts.ts:50-71` | `postSchema.partial()` aceita `{}` → no-op reportado como sucesso | Rejeitar se `Object.keys(...).length===0` |
| C-13 | `social_links` detectado por regex na msg de erro | BAIXO | confirmada | `profile.ts:46` | Engole erro pelo texto "column/social_links"; quebra se wording mudar | Checar código `42703` ou remover branch pós-migration |
| C-14 | `as never` na montagem de settings | BAIXO | confirmada | `admin/settings/page.tsx:17-21` | Anula checagem do union `visibility` | Validar `row.value` por schema |
| C-16 | `initials()` retorna "" em nome só-whitespace | BAIXO | média | `utils.ts:44-48` | Avatar fallback vazio | Após trim vazio retornar "U" |
| C-18 | `as PostCategory` sobre `searchParams` | BAIXO | confirmada | `community/page.tsx:23` | Categoria inválida → feed vazio silencioso | Validar contra `postCategoryEnum` |
| C-15/C-20 | `Link href="#"` p/ autor null; `key={i}` em skeleton estático | COSMÉTICO | confirmada | `post-card.tsx:155`; `community/page.tsx:75` | Sem impacto prático | `<span>` p/ autor null; (key i é inócuo) |
| E-2 | `points_ledger` duplica pontos quando `reference_id IS NULL` | BAIXO³ | alta | `0005:15` (`unique` não casa NULL) | App sempre passa `reference_id` (ok); seed passa NULL → re-rodar infla pontos | Documentar exigência; opcional `unique nulls not distinct` (PG17) |

¹ *Calibração adversarial: o agente C classificou C-1 como ALTO. Rebaixado a MÉDIO — é desync visual transitório do contador otimista (o estado no servidor está correto; `revalidatePath` corrige no próximo render). Continua prioritário por ser interação quente + correção trivial (P).*
² *C-11/B-7 são o mesmo problema sob ângulos diferentes (rate-limit). Consolidados na §13.*
³ *Latente: nenhum caller atual passa `reference_id` nulo no app de produção.*

**Verificado OK (não reauditar):** `safeNextPath` (open-redirect), sanitização de filtro PostgREST, `safeStoragePath`/`isSafeEmbedUrl`/`isSafePublicImageUrl`, `onReact` (updater funcional correto), `award_points` atômico sob concorrência (E-8), `params/searchParams` async do Next 16 corretos, ausência de `any` explícito no app (só no stub `db.ts`, intencional).

---

## 11. Desempenho

Avaliado sem otimização prematura. Classificação: **comprovável / risco provável / micro (NÃO agir)**.

| ID | Item | Sev | Classe | Evidência | Recomendação |
|---|---|:---:|---|---|---|
| D-1 | Trio `react-markdown`+`remark`+`rehype` no bundle client, parseado por card | MÉDIO¹ | **comprovável (medir antes)** | `markdown.tsx:1-5` usado em `post-card.tsx:217` p/ até 30 cards | **Medir** bundle/INP de `/community`; só então mover render p/ server | M |
| E-3 | Contagem de likes/comentários/reações do feed é O(linhas) | MÉDIO | risco (só em escala) | `queries/posts.ts:71-83` carrega todas as linhas filhas dos 30 posts e conta em JS | Quando houver post com >1k interações: RPC/view agregada ou `likes_count` materializado. **Por ora manter** | M |
| E-4 | Listas sem paginação: `admin/members`, `calendar` (eventos passados nunca filtrados) | MÉDIO | risco (cresce c/ base) | `admin/members/page.tsx:17-19`; `calendar/page.tsx:18-21` | Paginar `admin/members` (`.range()`) e filtrar `calendar` por janela. `resources`/`apps` podem esperar | P–M |
| D-2 | Feed monta 30 PostCards client sem paginação por cursor | MÉDIO | risco | `posts.ts:46`; `community/page.tsx:62-68` | "Carregar mais" por cursor quando o volume justificar. **Não virtualizar agora** | M |
| D-6 | Só 1 `loading.tsx` + 1 Suspense p/ ~30 páginas; dashboard bloqueia tudo | MÉDIO | risco | `(app)/loading.tsx`; `dashboard/page.tsx` | `Suspense`+skeleton nas seções pesadas do dashboard | M |
| D-8 | Mídia do post sem `aspect-ratio` (CLS) | BAIXO | comprovável | `post-card.tsx:221,229` | `aspect-video`+`object-cover` reservando altura | P |
| E-5/E-6/E-12 | `select("*")` pontual; full-scan de `lessons` na home de cursos; `is_pinned` fora do índice | BAIXO | micro (escala atual = nada) | `apps/page.tsx:21`; `queries/courses.ts:12`; `posts.ts:43` | **Não agir** no volume atual (2 cursos no seed; feed limit 30) | P |
| D-11 | Filtro do feed sem `useTransition` | BAIXO | risco UX | `feed-filter.tsx:21` | `useTransition`+`isPending` no pill | P |
| D-9 | Header client carrega `ThemeSettings` em toda rota | BAIXO | **micro — NÃO AGIR** | `header.tsx:1` | Sem medição apontando gargalo, não mexer | — |

¹ *Calibração: agente D classificou D-1 como ALTO; rebaixado a MÉDIO porque o próprio agente condiciona à medição (não há profiling). É o único risco de bundle comprovável, mas não-medido.*

**Positivos (manter):** `next/font`, `next/image` no logo com dimensões (sem CLS), otimismo de like/reação **isolado ao card** (não re-renderiza o feed — P-4: **não** adicionar memoização), ausência de barrels que quebrem tree-shaking, lucide importado por nome.

---

## 12. Overcoding

| ID | Item | Veredito | Ação |
|---|---|---|---|
| F-26 | Motor de tema de **4 eixos** (`theme` dark/light + `style` refined/cyberpunk/terminal + `accentH` + `density`) + `MutationObserver` (`useAccentHue`/`useDocumentTheme`) | **Overcoding limítrofe (MÉDIO).** O `<html>` hardcoda `dark/refined/comfortable`; o SettingsDrawer usa `style`/`density`, mas **nenhum consumidor canvas de `useAccentHue` foi localizado** neste módulo. Eixos extras/observers podem ser preparação p/ requisito inexistente. | **Confirmar-manualmente** se `style`/`density`/observers têm uso real. Só simplificar com evidência de não-uso (e cuidado: simplificar mal reintroduz FOUC). |
| A-4 | Leituras inline nas páginas vs camada `queries/` (admin nunca usa `queries/`) | **Não é overcoding — é sub-camada.** O sistema peca por **menos** camada, não mais. | Convenção por complexidade (join/agg→`queries/`; select trivial→inline). Não migrar triviais. |
| A-6 | Tipo de retorno triplicado | DTO duplicado real (ver §7) | Unificar (P2). |
| F-27 | Sentry guard-gated (`if (!DSN) return`) | **Não é overcoding** — observabilidade opcional bem feita, no-op sem DSN | Manter. |
| F-28 | Helpers `utils.ts` (`cn`/`initials`/`slugify`/`formatDate`) | **Não é overcoding** — múltiplos consumidores reais | Manter. |
| (geral) | Defesa em profundidade (proxy→require*→Zod→RLS) | **Arquitetura saudável, não overcoding** — as duplas-checagens (A-1, A-12) são intencionais e documentadas | Manter. |

**Anti-recomendações explícitas (NÃO fazer):** não introduzir `ThemeProvider` Context no root (clientizaria a árvore + FOUC — A-10); não criar wrapper genérico de autz (A-5); não criar `useFormComposer`/CrudKit (§7); não memoizar o otimismo do feed (P-4); não abstrair `error.tsx`/badges/avatares (§7).

---

## 13. Segurança

A postura de segurança do **código** é **forte** e melhorou substancialmente desde a baseline de 2026-06-14. Os CRÍTICOs anteriores estão fechados (verificado independentemente). Os riscos restantes são **operacionais/não-verificáveis por código** ou de **endurecimento**.

### 13.1 Verificações que PASSARAM (defesa real, não só UI) — confirmadas

| ID | Verificação | Evidência |
|---|---|---|
| P-1 | **SEC-01 fechado**: colunas sensíveis de `profiles` blindadas | `0009:33-34` `revoke update … from authenticated` + `grant update (full_name,username,bio,avatar_url)`; `0011:13` adiciona só `social_links` |
| P-2 | **SEC-05 fechado**: role/ban via RPC `SECURITY DEFINER` transacional | `0009:39-119` `admin_set_role`/`admin_set_banned` com `FOR UPDATE`, anti-lockout, anti-último-admin, anti-auto-ban |
| P-3 | **Owner absoluto** protegido por RLS/RPC (não só UI) | `0009:10-27` `is_owner()` + índice único parcial; `policies.ts:41-49`; owner não banível/rebaixável por admin comum |
| P-4 | **SEC-03 fechado**: aulas/módulos draft protegidos | `0010:13-36` policies por status do curso pai + defesa em profundidade em `queries/courses.ts:88-96` |
| P-5 | **SEC-08 corrigido**: `markLessonComplete` valida aula↔curso | `courses.ts:110-132` |
| P-6 | Auth usa **`getUser()`** (nunca `getSession`) | `proxy.ts:50`; `current-user.ts:11,19` |
| P-7 | Open-redirect mitigado no callback | `auth/callback/route.ts:9-13` (`safeNextPath`) |
| P-8 | Service role **isolado server-only** | `admin.ts:1-15` (`import "server-only"`), lido de env, usado só por `award_points` com inputs de código |
| P-9 | Validação **anti-SSRF / host allowlist** | `schemas.ts:7-20,67-86` (avatar bloqueia IP privado/loopback; social_links exige host da plataforma) |
| P-10 | **CSP/HSTS** fortes + `/admin` `no-store` | `next.config.ts:28-67` |
| P-11 | Banido bloqueado em **todos os INSERTs** (3 camadas) | `0006:69,93,116,176,265` (`is_not_banned()`) + action + UI + layout→`/banned` |

### 13.2 Achados de segurança (atuais)

| ID | Título | Sev | Conf | Evidência | Impacto / Recomendação |
|---|---|:---:|---|---|---|
| **SEC-DEMO** (B-2/E-10/F-4) | **Backdoor demo `codex123!`** | **ALTO** (condicional CRÍTICO) | confirmada (disco) / hipótese (cloud) | `seed.sql:7,35,46`==`_seed_cloud.sql`; creds em `.env.example:10-11`, `e2e/*`; **nenhum backdoor no código-fonte** (grep `src/` limpo) | Se aplicado na cloud no ar = admin real com senha pública. **P0:** verificar no Dashboard; se existir, rotacionar/remover após backup. Remover senha fixa do `.env.example`/seed (tornar seed dev-only). |
| **E-1** | **`_setup_cloud.sql` congelado em 0007** | **ALTO** | confirmada | grep `is_owner/social_links/post_reactions/admin_set_role` no arquivo → **0** | Provisionamento novo via esse arquivo nasce **sem** os fixes de SEC-01/SEC-03 e **sem** `is_owner`/`social_links`/`reactions` → app quebra + inseguro. **P0/P1:** parar de manter à mão; usar `migrations/` como fonte única (`supabase db push`) ou regerar de 0001–0012. **Implica P0:** confirmar que a cloud atual tem 0008–0012 aplicadas. |
| **F-15** | **`deploy.yml` (Hetzner/SSH) ainda ativo** | **ALTO** (condicional) / MÉDIO se sem secrets | confirmada | `.github/workflows/deploy.yml:1` SSH `/opt/codex-community` + `docker compose`, dispara em push | Se os secrets `HETZNER_*` existirem e o servidor estiver no ar, há **dois deploys de produção** possivelmente servindo código divergente sobre o mesmo banco. Se não há secrets, é ruído (falha vermelha por push). **P1:** desabilitar/arquivar (produção é Vercel). *Calibração: ALTO só se Hetzner estiver vivo — não verificável; tratado como P1.* |
| **B-7+C-11** | **Rate-limit in-memory ineficaz sob serverless + XFF forjável** | MÉDIO | alta | `rate-limit.ts:5-9,34-38` | `Map` por processo → na Vercel multiplica por instância e reseta em cold start; `x-forwarded-for` spoofável sem proxy confiável → brute-force de auth com eficácia ilusória. **P1 antes de cadastro público:** store compartilhado (Upstash/Redis) ou WAF de borda; garantir IP confiável. |
| **B-8** | Divergência de deploy Vercel×Hetzner amplifica B-7/SEC-04 | MÉDIO | confirmada | docs/`next.config`/`api/health` discordam do alvo | **P1:** fixar fonte única da verdade; alinhar rate-limit/health/redirect URLs. |
| **B-1** | `vercel.txt` versionado com 6 strings tipo-credencial | MÉDIO | confirmada | `git ls-files` → trackeado; `.gitignore:39` só impede futuros | **P1:** `git rm --cached vercel.txt`; se segredo, rotacionar + expurgar histórico. |
| **B-4** | Banido edita/apaga **próprio** post/comentário | BAIXO | confirmada | `posts.ts:50-52,79-81,239-241`; RLS UPDATE/DELETE sem `is_not_banned()` | Não escala nem toca conteúdo alheio. **P2:** `if(is_banned)` nas 3 actions (+ opcional na RLS). |
| **B-5** | Reação aceita em post deletado | BAIXO | alta | `0012:28-32`; `posts.ts:166-193` (não valida `is_deleted`) | Ruído de dados; não pontua, sem exposição. **P2:** validar `posts.is_deleted=false` na action. |
| **B-3** | Policies de Storage UPDATE sem `WITH CHECK` | BAIXO | alta | `0007:31-37,89-92` | Usuário poderia mover objeto p/ pasta de terceiro (sem dado sensível). **P2:** `with check` com `foldername[1]=auth.uid()`. |
| **INC-6/SEC-04** | `NEXT_PUBLIC_APP_URL=localhost` quebra e-mails em prod | MÉDIO | confirmada | `lib/env.ts` warning no build | **P0/P1 (Dashboard+env):** Site URL/Redirect URLs reais + `NEXT_PUBLIC_APP_URL=https://<domínio>`. |

**Resumo de postura:** o produto **não tem furo de segurança explorável no código atual**. O risco residual é (a) **incerteza sobre o estado da cloud** (migrations aplicadas? demo neutralizado?) — endereçável só no Dashboard; (b) **rate-limit** que precisa de store compartilhado antes de abrir cadastro público; (c) **higiene de repositório** (`vercel.txt`, seed). Tudo P0-verificação ou P1, nada que bloqueie começar features no código.

---

## 14. Qualidade

Notas 0–10 (média ponderada dos agentes + calibração do consolidador), cada uma com justificativa objetiva.

| Dimensão | Nota | Justificativa |
|---|:---:|---|
| **Arquitetura** | **8,0** | App Router/RSC/Server Actions exemplar; defesa em profundidade real; `cache()` evita refetch; boundaries client/server disciplinados (50/131 client, proporcional). Perde por 3 contratos de autz/retorno e gate de banido ancorado só no layout `(app)` (A-2). |
| **TypeScript** | **6,5** | `tsc`/ESLint verdes e quase zero `any` explícito (+). Mas a fonte de tipos do banco (`db.ts`) é stub `Insert/Update: any`, contornada por dezenas de casts não-verificáveis na borda de queries (C-7), com `error` do Supabase ignorado em pontos de auth/feed. Tipagem "passa" mas garante pouco onde mais importa. |
| **Segurança** | **8,0** | CRÍTICOs fechados e verificados; owner/RPC/CSP/SSRF/service-role sólidos. Perde por rate-limit serverless ineficaz, incerteza do estado da cloud e seed com senha pública. |
| **Banco e RLS** | **8,0** | Schema normalizado, FKs/uniques/índices nas colunas quentes, triggers corretos, idempotência impecável de 0008+. Perde por `_setup_cloud` defasado (E-1) e `unique` que não casa NULL (E-2). |
| **Frontend** | **8,0** | RSC sólido, tema sem FOUC (fonte única), `EmptyState` reusado em 14 páginas, otimismo com rollback. Perde por a11y de acabamento (aria-label/SheetTitle/touch targets WCAG 2.2) e estados de loading inconsistentes. |
| **Desempenho** | **7,5** | Bases corretas (next/font, next/image, sem micro-otimização inútil). Descontos por riscos **não medidos** (markdown no bundle, CLS) e listas sem paginação que crescem. |
| **Testes** | **6,0** | Suíte Playwright (public/member/admin) existe — bom sinal e contradiz o README. Mas **não executada** nesta auditoria, cobertura desconhecida, sem testes unitários. |
| **Documentação** | **6,5** | `docs/` de processo forte e rastreável (fases/segurança). Penalizada por descrever "um mundo parcialmente desatualizado" (CODEX, Hetzner, "7 migrations", "sem testes", deps que não existem, creds públicas). |
| **Manutenção** | **8,0** | Núcleo coeso, TS estrito, fatoração boa, zero código comentado/TODO abandonado. Penalizada por ~7 deps mortas, componentes UI órfãos e pipeline de deploy duplo. |
| **Prontidão p/ novas features** | **7,5** | Core saudável e extensível; bloqueada apenas por verificações operacionais P0 (cloud/demo/deploy) e P1 curtos. |

**Score global ponderado: ~7,5/10** — base sólida, bem arquitetada e segura no código, pronta para evoluir assim que os P0 operacionais forem confirmados.

---

## 15. Tabela consolidada de achados

Deduplicada entre agentes. Severidade já calibrada. Confiança: confirmada / alta / média / hipótese.

| ID | Título | Categoria | Sev | Conf | Evidência | Prio | Esf |
|---|---|---|:---:|---|---|:---:|:---:|
| SEC-DEMO | Backdoor demo `codex123!` (verificar cloud) | segurança | ALTO | conf/hip | `seed.sql:7,35`; `_seed_cloud.sql` | **P0** | P |
| E-1 | `_setup_cloud.sql` congelado em 0007 | banco/idempotência | ALTO | conf | `_setup_cloud.sql` (grep=0) | **P0/P1** | P |
| SEC-04 | `NEXT_PUBLIC_APP_URL`/Auth cloud (e-mails) | auth/config | MÉDIO | conf | `env.ts` warning | **P0** | P |
| F-15 | `deploy.yml` Hetzner ativo | infra-legacy | ALTO¹ | conf | `deploy.yml:1` | **P1** | P |
| B-7+C-11 | Rate-limit serverless + XFF | rate-limit | MÉDIO | alta | `rate-limit.ts:5-9,34-38` | **P1** | M |
| B-8 | Deploy Vercel×Hetzner divergente | inconsistência | MÉDIO | conf | docs/`next.config`/`health` | **P1** | P |
| B-1 | `vercel.txt` versionado | segredo | MÉDIO | conf | `git ls-files` + `.gitignore:39` | **P1** | P |
| A-2 | Gate de banido só no layout `(app)` | sobreposição | MÉDIO | alta | `(app)/layout.tsx:8` vs páginas | **P1** | P |
| C-1 | Like com contador stale | bug | MÉDIO¹ | conf | `post-card.tsx:66-78` | **P1** | P |
| C-5 | Toggle like/reação sem atomicidade | concorrência | MÉDIO | alta | `posts.ts:144-158,177-193` | P2 | M |
| C-6 | Erro Postgres cru vaza ao usuário | erro-tratado | MÉDIO | conf | `posts.ts:42`; `courses.ts:29` | P2 | M |
| C-7 | Perda de tipagem na borda Supabase | tipagem | MÉDIO | conf | `queries/posts.ts:67`; `db.ts:245` | P2 | M(G) |
| C-2 | `getCurrentProfile` ignora error | tipagem/erro | MÉDIO | conf | `current-user.ts:22-28` | P2 | P |
| C-3 | LessonPage não valida lesson↔course | bug/validação | MÉDIO | alta | `lessons/[lessonId]/page.tsx:13` | P2 | P |
| C-4 | Hydration mismatch `useTweaks` | rsc-boundary | MÉDIO | alta | `theme.ts:36-37` | P2 | P |
| INC-1 | Deps mortas listadas como stack | dependência/doc | MÉDIO | conf | README:26,47 vs grep=0 | P2 | P |
| F-5/F-6/F-7 | `@tanstack/react-query`, `react-hook-form`, `date-fns` mortos | dependência | MÉDIO | conf | grep `src/`=0 | P2 | P |
| E-3 | Contagem de feed O(linhas) | n+1/perf | MÉDIO | alta | `queries/posts.ts:71-83` | P2/P3 | M |
| E-4 | Listas sem paginação (members/calendar) | paginação | MÉDIO | conf | `admin/members:17`; `calendar:18` | P2 | P–M |
| D-2 | Feed 30 cards sem cursor | perf | MÉDIO | conf | `posts.ts:46` | P2 | M |
| D-6 | Loading/Suspense inconsistente | estado-ui | MÉDIO | conf | `(app)/loading.tsx`; dashboard | P2 | M |
| D-1 | Markdown no bundle client (medir) | bundle | MÉDIO¹ | alta | `markdown.tsx:1-5` | P2 | M |
| D-3 | Botão de ações do post sem aria-label | a11y | MÉDIO | conf | `post-card.tsx:179` | P2 | P |
| D-4 | Sheet mobile sem `SheetTitle` | a11y | MÉDIO | alta | `header.tsx:35` | P2 | P |
| F-26 | Motor de tema 4 eixos (confirmar uso) | overcoding | MÉDIO | média | `theme.ts`/`theme-constants.ts` | P3 | M |
| F-4 | Creds demo em `.env.example`/e2e | naming/segredo | MÉDIO | conf | `.env.example:10-11` | P2 | P |
| A-5 | 3 estilos de autz de mutação | sobreposição | MÉDIO | conf | `resources…:15`/`posts:67`/`admin:35` | P2 | M |
| A-6 | Tipo de retorno triplicado | overcoding | BAIXO | conf | `auth.ts:11`/`posts.ts:14` | P2 | P |
| A-11 | Delete inline duplicado (4–5×) | duplicação | BAIXO | alta | `admin/*/...-actions.tsx` | P2 | M |
| A-7/INC-7 | `api/health` marca/porta errada | inconsistência | BAIXO | conf | `api/health/route.ts:9,11` | P2 | P |
| B-4 | Banido edita/apaga próprio conteúdo | autorização | BAIXO | conf | `posts.ts:50,79,239` | P2 | P |
| B-5 | Reação em post deletado | rls | BAIXO | alta | `posts.ts:166-193` | P2 | P |
| B-3 | Storage UPDATE sem WITH CHECK | storage | BAIXO | alta | `0007:31-37,89-92` | P2 | P |
| E-2 | `points_ledger` NULL não deduplica | trigger/modelagem | BAIXO | alta | `0005:15` | P2/P3 | P |
| C-8..C-19 | error descartado / toast mente / update vazio / etc. | bug/erro | BAIXO | conf/média | (ver §10) | P2/P3 | P |
| D-5/D-8/D-10/D-11 | touch targets / CLS / labels / filtro | a11y/perf | BAIXO | alta | (ver §11) | P2 | P |
| D-7/F-10 | `confirm-dialog.tsx` morto | morto | BAIXO | conf | grep=0 | P2/P3 | P |
| F-8/F-9 | Radix/shadcn órfãos | dependência/morto | BAIXO | conf | grep=0 | P3 | P |
| F-11/F-12/F-13 | SVGs boilerplate, NEXUS LOGO.png, dev-server.log | asset/morto | BAIXO | conf | grep=0 | P3 | P |
| F-14 | Infra Docker/Caddy (confirmar) | infra-legacy | MÉDIO | alta | `Dockerfile`/`Caddyfile` | P2/P3 | P |
| B-6 | `profiles_select_all` expõe colunas | rls | BAIXO | conf | `0006:8-11` | P3 | M |
| INC-2..INC-10 | Docs desatualizados (migrations/testes/CODEX/etc.) | inconsistência | BAIXO | conf | (ver §6) | P2 | P–M |
| C-15/C-20/F-1/F-2/F-29 | naming, keys estáticas, verbosidade, sem TODOs | cosmético | COSM | conf | (ver §10/§9) | P3 | P |

¹ *Calibrado pelo adversarial: SEC/F-15 ALTO só se Hetzner vivo; C-1/D-1 rebaixados de ALTO (ver §10/§11/§18).*

---

## 16. Matriz severidade × esforço

`P`=baixo (≤2h), `M`=médio (½–1 dia), `G`=grande (>1 dia). Posição = onde priorizar.

| | **Esforço P** | **Esforço M** | **Esforço G** |
|---|---|---|---|
| **ALTO** | SEC-DEMO·(verif), E-1, F-15 | — | — |
| **MÉDIO** | SEC-04, B-1, B-8, A-2, C-1, C-2, C-3, C-4, F-4, F-5/6/7, INC-1, E-4 | B-7+C-11, C-5, C-6, C-7, E-3, D-1, D-2, D-6, A-5, F-26 | C-7 (se gerar `db:types` completo) |
| **BAIXO** | A-6, A-7, B-3, B-4, B-5, E-2, D-3, D-4, D-5, D-8, D-10, D-11, D-7/F-10, F-8/9/11/12/13, C-8..C-19, INC-2..10 | A-11, F-14 | — |
| **COSMÉTICO** | C-15, C-20, F-1, F-2, F-29 | — | — |

**Leitura:** o grosso da dívida é **canto inferior-esquerdo** (baixo impacto × baixo esforço = limpeza incremental, P2/P3). Os ALTOs são todos **esforço P** e majoritariamente **verificação operacional**, não reescrita. Não há nada em ALTO×G — ou seja, **nenhum bloqueador caro**.

---

## 17. Priorização (P0 / P1 / P2 / P3 / Não agir)

### P0 — Corrigir/verificar antes de qualquer feature

São **verificações operacionais** (Dashboard Supabase / Vercel), não mudança de código. **Faça backup do banco antes de qualquer SQL.**

| # | Ação | Por quê | Onde | Critério de aceite |
|---|---|---|---|---|
| P0-1 | **Confirmar que a cloud tem 0008–0012 aplicadas** | `_setup_cloud.sql` está em 0007 (E-1); sem isso a segurança SEC-01/03 e features social/reactions não existem | SQL Editor: `select proname from pg_proc where proname in ('admin_set_role','is_owner')`; `select column_name from information_schema.columns where table_name='profiles' and column_name='is_owner'`; `select policyname from pg_policies where tablename in ('lessons','course_modules')` | Funções/coluna/policies presentes; se faltar, aplicar 0008–0012 |
| P0-2 | **Verificar/neutralizar o backdoor demo** | `admin@codex.community`/`codex123!` (SEC-DEMO) | Dashboard → Auth; `select email,role from auth.users join profiles using(id) where email like '%@codex.community'` | Nenhum admin demo ativo; senha do admin real rotacionada; admin/owner real marcado |
| P0-3 | **Auth URLs + `NEXT_PUBLIC_APP_URL` de produção** | e-mails de confirmação/reset quebram com localhost (SEC-04/INC-6) | Dashboard → Auth → URL Configuration; Vercel env | `NEXT_PUBLIC_APP_URL=https://<domínio>`; Site/Redirect URLs reais; warning do `env.ts` some |
| P0-4 | **Fixar fonte única de deploy** | Vercel×Hetzner ativos (B-8/F-15) | Confirmar se `deploy.yml` tem secrets/servidor vivo | Decisão registrada; se Vercel, plano de desativar `deploy.yml` |

### P1 — Corrigir antes da próxima sequência de features

Curtos, baixo risco, alta chance de gerar regressão/retrabalho se ignorados.

| # | Ação | ID | Esf |
|---|---|---|:---:|
| P1-1 | Trocar rate-limit in-memory por store compartilhado (Upstash) **antes de abrir cadastro público**; garantir IP confiável (XFF) | B-7+C-11 | M |
| P1-2 | `git rm --cached vercel.txt`; rotacionar se segredo | B-1 | P |
| P1-3 | Padronizar páginas autenticadas para `requireActiveProfile()` | A-2 | P |
| P1-4 | Corrigir contador de like (updater funcional) — interação quente | C-1 (+C-9) | P |
| P1-5 | Desabilitar/arquivar `deploy.yml` (Hetzner) se Vercel é definitiva | F-15 | P |
| P1-6 | Regerar/abandonar `_setup_cloud.sql` (usar `migrations/` como fonte) | E-1 | P |
| P1-7 | Remover senha pública do `.env.example` / tornar seed dev-only | F-4/SEC-DEMO | P |

### P2 — Corrigir junto da área afetada (sem projeto paralelo de refactor)

`C-2..C-7`, `C-12/C-13/C-14`, atomicidade de toggles (C-5), erro amigável (C-6), validação lesson↔course (C-3); a11y (D-3/D-4/D-5/D-8/D-10/D-11); paginação `admin/members`+`calendar` (E-4); remover deps mortas (F-5/6/7/8) e componentes órfãos (F-9/D-7/F-10); unificar tipo de retorno (A-6) e delete inline (A-11); `api/health` (A-7); banido edita próprio (B-4); reação em post deletado (B-5); Storage WITH CHECK (B-3); **sincronizar docs** (INC-1..INC-10); naming `package.json`/health (com HUB). Endurecer: medir bundle do markdown (D-1) antes de mexer.

### P3 — Backlog técnico (sem urgência)

`profiles_select_all` via VIEW (B-6); `points_ledger` NULL (E-2); contagem agregada do feed (E-3) **quando** houver post viral; índice `is_pinned`/`lesson_comments` **quando** escalar; assets boilerplate (F-11/12/13); confirmar/arquivar infra Docker (F-14); confirmar uso dos eixos extras do motor de tema (F-26).

### Não agir (custo > benefício ou cria overcoding)

- **Memoização** do otimismo do feed (P-4), **virtualização** do feed (D-2 só "carregar mais"), fronteira client do header (D-9), verbosidade de links (D-12) — **sem medição**.
- **Índices** em tabelas de baixo volume (E-5/E-6/E-12) — escala atual não justifica.
- **Abstrações:** `useFormComposer`/CrudKit (§7), wrapper de autz (A-5), `ThemeProvider` Context (A-10), unificar badges/avatares/`error.tsx` (§7) — aumentariam complexidade líquida.
- **Remover** camada de defesa em profundidade (A-1/A-12) ou o SELECT extra de visibilidade de curso — enfraqueceria a segurança.
- **Reescrever** o stub `db.ts` à mão — a saída correta é `pnpm db:types`, não datilografia.

---

## 18. Riscos de regressão

| Mudança proposta | Risco | Mitigação |
|---|---|---|
| **Aplicar/confirmar migrations na cloud (P0-1)** | Médio — DDL em produção | Backup obrigatório; migrations 0008+ são idempotentes; testar em local (`pnpm db:reset`) antes |
| **Neutralizar demo (P0-2)** | Alto se apagar dado real | Backup; `SELECT` de conferência; garantir admin real **antes** de remover demos; `auth.users` não volta sozinho |
| **Travar/rotacionar rate-limit (P1-1)** | Baixo | Não muda contrato; testar fluxos de auth (login/register/forgot) |
| **`requireActiveProfile` nas páginas (P1-3)** | Baixo (custo zero via `cache()`) | Verificar que banido continua indo a `/banned` e não a loop |
| **Corrigir like stale (P1-4)** | Baixo | Teste de clique duplo; não tocar a action server (já correta) |
| **Remover deps mortas (P2)** | Baixo (0 imports confirmado) | `pnpm build` + `typecheck` após; remover 1 por commit |
| **Remover componentes/assets órfãos (P2/P3)** | Baixo (0 usos confirmado) | grep + build após cada remoção |
| **Desabilitar `deploy.yml` (P1-5)** | Baixo | Confirmar que Vercel é o único deploy ativo antes |

**Riscos da auditoria super-avaliarem (calibração adversarial aplicada):**
- **C-1 (like) e C-9 (rsvp)** foram rebaixados de ALTO→MÉDIO/BAIXO: são desyncs **transitórios** do otimismo (estado servidor correto; `revalidatePath` corrige). Reais e fáceis de corrigir, mas não corrompem dados.
- **D-1 (markdown bundle)** rebaixado ALTO→MÉDIO: risco **não medido**; recomendação é **medir antes** de mover render — não refatorar às cegas.
- **F-15 (deploy Hetzner)** é ALTO **apenas se** o servidor estiver vivo com secrets — não verificável; tratado como P1.
- **SEC-DEMO** é o único item com potencial CRÍTICO, mas **condicional ao estado da cloud** — por isso é P0-verificação, não P0-código.

---

## 19. Recomendação para início das próximas features

**O código está pronto para receber features.** Recomendação operacional:

1. **Antes de codar:** rodar os **4 itens P0** (verificações no Dashboard/Vercel + backup). São rápidos e fecham a única incerteza real (estado da cloud + demo + e-mails + deploy).
2. **Na primeira janela curta (P1, ~1 dia):** rate-limit compartilhado (se for abrir cadastro), `vercel.txt`, `requireActiveProfile`, like-stale, desativar `deploy.yml`, fonte única do `_setup_cloud`. São todos esforço P (exceto rate-limit M) e baixo risco.
3. **Durante as features (P2, oportunístico):** corrigir o item da área que você tocar — ex.: ao mexer no feed, resolver C-5/C-6/D-3/D-8; ao mexer em admin, A-11/E-4. **Não** abrir um projeto paralelo de refactor.
4. **Regenerar `db.ts`** (`pnpm db:types`) cedo — é a causa-raiz de C-7 e melhora a segurança de tipos de **todas** as features novas com baixo custo.
5. **Sincronizar a documentação** com a realidade (deps, migrations, testes, naming, deploy) — barato e evita que a próxima IA/dev parta de premissas erradas.

**Áreas de baixo atrito para novas features** (já preparadas no schema/arquitetura): nova categoria/tipo (`constants.ts`+CHECK), nova ação de gamificação (`PointsAction`+`awardPoints`), nova aba (`nav-items.ts`), novo CRUD admin (seguir `admin/resources`). `post_reactions` (0012) e `social_links` (0011) já estão prontos e com RLS correta.

---

## 20. Critérios de aceite

Para considerar a auditoria endereçada e seguir para features com segurança:

**Bloco P0 (obrigatório antes de features):**
- [ ] Backup do banco realizado.
- [ ] Confirmado no SQL Editor: `is_owner`, `admin_set_role`/`admin_set_banned`, policies `lessons_select_published_or_mod` presentes (0008–0012 aplicadas).
- [ ] Nenhum usuário `@codex.community` ativo como admin com senha pública; admin/owner real estabelecido.
- [ ] `NEXT_PUBLIC_APP_URL` = domínio de produção; Site/Redirect URLs do Supabase configuradas; warning do build sumiu.
- [ ] Fonte única de deploy decidida e registrada.

**Bloco P1 (antes da próxima sequência):**
- [ ] Rate-limit em store compartilhado (se cadastro público) **ou** decisão documentada de adiar com cadastro fechado.
- [ ] `vercel.txt` fora do índice (e rotacionado se segredo).
- [ ] Páginas autenticadas usam `requireActiveProfile()`.
- [ ] Like/RSVP sem desync no clique duplo.
- [ ] `deploy.yml` Hetzner desabilitado (se Vercel é definitiva).

**Invariantes (não regrediram) — reconfirmar após qualquer mudança:**
- [ ] `pnpm typecheck` / `lint` / `build` permanecem verdes.
- [ ] Cadastro→confirmação→login→post→curtir→ranking funcionam fim-a-fim.
- [ ] Owner protegido em `/admin/members`; banido→`/banned`; membro comum barrado em `/admin`; curso draft oculto p/ membro.

**Critério de qualidade contínua:**
- [ ] Nenhuma feature nova reintroduz `error.message` cru na UI, `select("*")` em lista paginável, ou dependência sem uso.
- [ ] `db.ts` regenerado por `pnpm db:types` (não editado à mão).

---

## Apêndice — Rastreabilidade

- **Agentes:** A (Architect/arquitetura), B (security-engineer/segurança), C (code-reviewer/TS), D (frontend-developer/UI-perf), E (general-purpose/banco), F (general-purpose/legacy) + consolidador adversarial.
- **Comandos executados (read-only):** `git status/log/rev-parse/ls-files`, `pnpm typecheck`, `pnpm lint`, `pnpm build`, `grep`/`find` de imports/usos, leitura de migrations/seed/docs. **Nenhum** comando de escrita, SQL, install ou deploy.
- **Verificações independentes do consolidador:** migrations `0009`/`0010`/`0012` (SEC-01/03 fechados, reactions RLS ok), `seed.sql`/`_setup_cloud.sql` (backdoor + congelamento 0007), `git ls-files` (vercel.txt + HEAD real `df23feb`), grep de deps mortas (RHF/tanstack/date-fns/Radix).
- **Limitações:** estado da cloud, plataforma de deploy ao vivo e execução E2E fora de escopo (declarado na §2).

*Documento gerado pela auditoria técnica pré-features de 2026-06-30. Read-only: nenhum código, banco ou deploy foi tocado.*
