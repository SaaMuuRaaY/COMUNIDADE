# AUDITORIA BASELINE — CODEX Community

> **Tipo:** Auditoria técnica read-only (sem implementação). **Data:** 2026-06-14.
> **Módulo:** `COMUNIDADE/` (codex-community) — Next.js 16.2.6 + React 19 + TypeScript + Supabase (Auth/DB/Storage/RLS) + Tailwind 4 + shadcn/ui. Porta dev 3004.
> **Objetivo:** Mapear o estado real ANTES da Fase 1 de produção segura (owner, admin, Auth, emails, dados demo), evitando regressões.
> **Como este doc foi produzido:** leitura direta de arquivos (`arquivo:linha`) + bateria estática real (`pnpm install/lint/typecheck/build`) + 11 agentes de auditoria com verificação adversarial dos achados. Nenhum dado de produção foi tocado; nenhum arquivo de código foi alterado.

---

## ⚡ O que corrigir PRIMEIRO (ordem priorizada)

Antes de onboarding de membros reais, nesta ordem:

1. **[SEC-02] Verificar e neutralizar o backdoor demo.** Confirmar se `_seed_cloud.sql` foi aplicado no banco que está online. Se sim, `admin@codex.community / codex123!` é um **admin real com senha pública**. → trocar senha / remover usuários demo. *(precisa Dashboard Supabase; fazer **backup** antes de qualquer DELETE)*
2. **[SEC-01] Fechar a policy `profiles_update_own`.** Qualquer usuário autenticado pode se **auto-desbanir** e **forjar `points`/`level`** via API direta. → migration (revogar UPDATE de colunas sensíveis). *(precisa migration + **backup**)*
3. **[SEC-03] Fechar o vazamento de aulas de cursos `draft`** (RLS `lessons`/`course_modules` com `USING(true)`). *(precisa migration)*
4. **[SEC-04] Configurar Auth no Dashboard Supabase cloud** (Site URL + Redirect URLs do domínio real) — senão confirmação/reset de e-mail quebram. *(precisa Dashboard)*
5. **[DOC-01] Alinhar o entendimento de deploy:** a infra configurada é **Hetzner (Docker+Caddy)**, não Vercel. Decidir qual é a verdade antes de mexer em env/redirect.
6. **Encaixar o owner absoluto** (proposta no Apêndice G) junto com a correção de SEC-01.

> Regra de ouro: **nenhuma das correções abaixo deve ser aplicada nesta etapa.** Os patches prontos estão no Apêndice G, marcados `NÃO APLICADO`.

---

## A. Score geral (0–10)

| Dimensão | Score | Justificativa de 1 linha |
|---|:---:|---|
| **Técnico** | **7.5** | Build e typecheck verdes, arquitetura limpa, Zod+rate-limit+CSP; perde por `db.ts` com `any` (143 casts) e lint vermelho. |
| **Segurança** | **5.0** | Boa defesa em profundidade nas actions, MAS 1 CRÍTICO de RLS (auto-unban/fraude de pontos) + backdoor demo + vazamento de draft. |
| **Arquitetura** | **8.0** | Separação clara action/query/permissão/RLS, idempotência via `award_points`, RLS em todas as 18 tabelas; ótima base. |
| **UX/UI** | **7.0** | Consistente (PT-BR, shadcn, empty states, auth limpo); perde por linguagem "MVP/beta", badges crus em inglês e falta de onboarding. |
| **Prontidão p/ membros reais** | **4.0** | Bloqueada pelos achados CRÍTICO/ALTO de segurança e pelos dados demo; funcionalmente os fluxos passam (19/20). |
| **Manutenção futura** | **6.5** | Código organizado e idempotente, mas tipagem fraca, duplicações (forms/deletes) e docs desatualizados elevam o custo. |

**Score global ponderado: ~6.0/10** — base sólida e bem arquitetada, **não pronta para produção segura** até resolver os 4 primeiros itens acima.

---

## B. Estado atual

### ✅ Pronto (funciona e é confiável)
- **Auth core**: login/cadastro/recuperação/logout/callback com rate-limit por IP, Zod, anti-open-redirect (`safeNextPath`), criação de profile via trigger `handle_new_user`.
- **Proteção de rotas**: `proxy.ts` (Next 16, substitui `middleware.ts`) + `requireProfile`/`requireRole` no layout — dupla camada. 19 de 20 fluxos E2E (simulados) passam.
- **RLS habilitada em todas as 18 tabelas**; banidos bloqueados em escrita em 3 camadas (action + RLS `is_not_banned()` + UI oculta).
- **Gamificação idempotente**: `award_points` (SECURITY DEFINER + `UNIQUE`), `points_ledger` imutável, nível recalculado atomicamente.
- **Build verde**: `next build` (28 rotas) e `tsc --noEmit` passam. CSP/HSTS/headers de segurança fortes; service role isolado em módulo `server-only`.

### 🟡 Parcialmente pronto
- **Confirmação de e-mail**: código trata o branch `pending`, mas `config.toml` local tem `enable_confirmations=false` → comportamento diverge local×cloud.
- **Conteúdo de cursos**: estrutura completa (curso→módulo→aula→progresso), mas `is_free` nunca é aplicado e draft vaza (SEC-03).
- **Painel admin**: CRUD completo e protegido, porém overview só-leitura, alguns badges crus em inglês, e operações de manutenção (fixar post, reordenar) só via SQL.
- **Notificações**: triggers automáticos existem (0008), mas docs dizem que não; sino sem badge de não-lidas.

### 🔴 Frágil
- **Integridade de dados via RLS** (`profiles`): colunas sensíveis graváveis pelo dono (SEC-01).
- **Tipagem do banco**: `db.ts` é stub manual com `Insert/Update: any` → escrita sem type-check, 143 casts.
- **Pipeline**: CI (`pnpm lint`) vermelho; docs de deploy (Vercel) divergem da infra real (Hetzner).

### ⛔ Bloqueando produção segura
- **SEC-01** (auto-unban/fraude de pontos), **SEC-02** (backdoor demo), **SEC-03** (vazamento draft), **SEC-04** (Auth redirect cloud). Ver Seção E e Apêndice G.

---

## C. Mapa da estrutura atual

### Árvore comentada (sem `node_modules`)

```
COMUNIDADE/
├── proxy.ts                      # Next 16: guard de rotas (auth + admin). NÃO é middleware.ts
├── next.config.ts                # CSP/HSTS, remotePatterns Supabase, output standalone só se DOCKER_BUILD=1
├── package.json                  # scripts: dev/build/start/lint/typecheck/db:*/test:e2e
├── Dockerfile, docker-compose.yml, Caddyfile   # infra REAL de deploy (Hetzner)
├── .github/workflows/ci.yml      # CI: typecheck + lint + build (lint está VERMELHO)
├── .github/workflows/deploy.yml  # Deploy (Hetzner) via SSH + docker compose
├── vercel.txt                    # ⚠️ 6 strings tipo-token, fora do .gitignore
├── .gitignore                    # ignora .env*; espera .env.example (que NÃO existe)
├── docs/  PROJETO.md PLAYBOOK.md PRODUCAO.md   # docs (parcialmente desatualizados)
├── e2e/   *.spec.ts               # Playwright (público/membro/admin) — NÃO rodado nesta auditoria
├── supabase/
│   ├── config.toml               # stack LOCAL (enable_confirmations=false, site_url localhost:3004)
│   ├── migrations/ 0001..0008    # schema + RLS + storage + triggers de notificação
│   ├── seed.sql / _seed_cloud.sql# ⚠️ 5 usuários demo, senha codex123! (idênticos)
│   └── _setup_cloud.sql          # migrations concatenadas p/ SQL Editor da cloud
└── src/
    ├── app/
    │   ├── page.tsx              # landing pública ("beta"/"MVP")
    │   ├── (auth)/{login,register,forgot-password}/  + error.tsx
    │   ├── (app)/               # rotas autenticadas (layout = requireProfile)
    │   │   ├── dashboard community courses resources apps calendar
    │   │   ├── leaderboard profile members notifications
    │   ├── admin/               # rotas admin (proxy exige role=admin + layout requireAdmin)
    │   ├── (legal)/{termos,privacidade}/  + auth/callback + api/health
    ├── server/
    │   ├── actions/  auth admin posts profile courses resources-apps-events
    │   └── queries/  dashboard posts courses
    ├── lib/
    │   ├── auth/current-user.ts        # getCurrentProfile, requireProfile/Role/Admin/Moderator
    │   ├── permissions/policies.ts     # isAdmin/isModerator/canPost (espelho TS da RLS)
    │   ├── supabase/{server,client,admin}.ts  # admin.ts = service role, server-only
    │   ├── points/award.ts             # chama RPC award_points
    │   ├── security/rate-limit.ts      # rate-limit in-memory (caveat documentado)
    │   ├── validations/schemas.ts      # Zod p/ todas as entidades (+ SSRF em avatar)
    │   ├── constants.ts                # COMMUNITY_ID, POINTS, levelFromPoints (DEAD)
    │   └── env.ts                      # valida envs públicas no boot
    └── types/db.ts                     # ⚠️ STUB manual, Insert/Update: any
```

### Rotas

**Públicas** (`proxy.ts:4-12`): `/`, `/login`, `/register`, `/forgot-password`, `/auth/callback`, `/termos`, `/privacidade`, `/api/health`.
**Autenticadas** (grupo `(app)`, `requireProfile`): `/dashboard`, `/community`, `/community/[postId]`, `/courses`, `/courses/[courseId]`, `/courses/[courseId]/lessons/[lessonId]`, `/resources`, `/apps`, `/calendar`, `/leaderboard`, `/profile`, `/members/[userId]`, `/notifications`.
**Admin** (`/admin/*`, `proxy` exige `role=admin` + `requireAdmin`): `/admin`, `/admin/courses` (+`/new`, `/[id]/edit`), `/admin/posts`, `/admin/resources`, `/admin/apps`, `/admin/events`, `/admin/members`, `/admin/settings`.

### Server Actions (formato de retorno `{ ok, error?, id? }`)

| Arquivo | Actions | Gating |
|---|---|---|
| `auth.ts` | login, register, resendConfirmation, forgotPassword, logout | público + rate-limit |
| `posts.ts` | createPost, updatePost, deletePost, togglePostLike, createComment, deleteComment | `requireProfile` (+`is_banned`) / autor‖mod |
| `profile.ts` | updateProfile | `requireProfile` (whitelist Zod) |
| `courses.ts` | createCourse/Module/Lesson, updateCourse, deleteCourse, **markLessonComplete** | `requireModerator` / `requireProfile` |
| `resources-apps-events.ts` | createResource/App/Event, delete*, **rsvpEvent** | `requireModerator`/`requireAdmin`/`requireProfile` |
| `admin.ts` | setMemberRole, setMemberBanned, updateSetting | `requireAdmin` (+anti-lockout) |

### Queries RSC: `dashboard.ts` (4 queries paralelas), `posts.ts`, `courses.ts`, leaderboard inline.
### Componentes críticos: `post-card` (optimistic+rollback), `lesson-player`, `comment-list`, `member-row`, `confirm-delete-icon-button`, `empty-state`, `markdown` (rehype-sanitize).

### Migrations / Tabelas (18)
`0001` profiles, communities, community_members (+helpers `is_admin/is_moderator/is_not_banned`, `handle_new_user`) · `0002` posts, post_comments, post_likes · `0003` courses, course_modules, lessons, lesson_progress, lesson_comments · `0004` resources, apps, events, event_attendees, settings · `0005` points_ledger, notifications (+`award_points`, `recalc_level`, trigger like→pontos) · `0006` RLS de todas as tabelas · `0007` storage · `0008` triggers de notificação (comentário/curtida).

### Storage buckets (`0007`)
`avatars` (pub, 5MB), `post-media` (pub, 50MB), `videos` (priv, 500MB), `resources` (priv, 100MB), `apps` (priv, 50MB), `course-covers` (pub, 10MB). Políticas por dono/moderador/admin + `is_not_banned()`.

### Variáveis de ambiente
`NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `NEXT_PUBLIC_APP_URL` (validadas em `env.ts`); `SUPABASE_SERVICE_ROLE_KEY` (server-only); `SENTRY_DSN`/`NEXT_PUBLIC_SENTRY_DSN`, `NODE_ENV`, `DOCKER_BUILD`. **Não existe `.env.example`** versionado.

---

## D. Diagramas (texto)

### D.1 Arquitetura geral
```
Browser (RSC + Client Components, anon key pública)
   │  fetch/Server Actions
   ▼
proxy.ts ──(auth gate)──► Next.js 16 App Router (Vercel-padrão OU Docker standalone)
   │                          │
   │                          ├─ Server Components ── createClient(server.ts, anon+JWT cookie)
   │                          ├─ Server Actions ───── requireProfile/Role ──► Supabase
   │                          └─ lib/points/award ── createAdminClient(service role) ─► RPC award_points
   ▼
Supabase Cloud
   ├─ Auth (auth.users, trigger handle_new_user → profiles)
   ├─ Postgres + RLS (18 tabelas; is_admin/is_moderator/is_not_banned)
   └─ Storage (6 buckets, RLS por dono/role)
```
> ⚠️ A **RLS é o boundary real**: o browser tem a anon key e pode chamar o PostgREST direto, contornando as Server Actions. Daí a gravidade de SEC-01/SEC-03.

### D.2 Fluxo de Auth
```
/register ─► registerAction (Zod, rate 5/min) ─► auth.signUp(emailRedirectTo=APP_URL/auth/callback)
   │                                                   └─ trigger on_auth_user_created ─► profiles(role=member)
   ├─ sem sessão ─► {pending:true} ("confirme seu e-mail")   [depende do Dashboard cloud: confirmações ON]
   └─ com sessão ─► redirect /dashboard
/auth/callback ─► safeNextPath (anti open-redirect) ─► exchangeCodeForSession ─► /dashboard | /login?error=auth
proxy: deslogado+rota privada ─► /login?redirectedFrom ; logado em /login ─► /dashboard
```

### D.3 Fluxo de role/admin
```
profiles.role ∈ {admin, moderator, member} + is_banned
is_admin()      = role=admin     AND NOT is_banned   (SECURITY DEFINER)
is_moderator()  = role∈{admin,moderator} AND NOT is_banned
acesso /admin   = proxy(role=admin) + layout requireAdmin   (dupla camada)
setMemberRole/Banned ─► requireAdmin + guardas (não auto-rebaixar, não remover último admin, não banir admin)
   └─ ⚠️ SEC-05: checagem "último admin" é read-then-write (race)
   └─ ⚠️ FALTA owner absoluto (proposta no Apêndice G)
```

### D.4 Fluxo de criação de post
```
post-composer ─► createPostAction ─► requireProfile + is_banned? + rate 12/min ─► postSchema
   ─► insert posts(author_id=auth.uid())  [RLS posts_insert_own: author_id=auth.uid() AND is_not_banned()]
   ─► awardPoints(post_created,+10, ref=post.id)  [idempotente]
   ─► revalidatePath('/community','/dashboard')
```

### D.5 Fluxo de conclusão de aula
```
lesson-player ─► markLessonCompleteAction ─► requireProfile + is_banned?
   ─► upsert lesson_progress(onConflict lesson_id,user_id)  [idempotente]
   ─► awardPoints(lesson_completed,+15, ref=lessonId)  [idempotente]
   └─ ⚠️ SEC-08: não valida que a aula pertence ao curso nem que está publicado
```

### D.6 Fluxo de gamificação
```
ação (post/comment/like/lesson/event) ─► award_points(user, action, pts, ref_type, ref_id)  [SECURITY DEFINER]
   ├─ INSERT points_ledger ON CONFLICT(user,action,ref_type,ref_id) DO NOTHING   [imutável, idempotente]
   └─ UPDATE profiles.points += pts, level = recalc_level(points)   [atômico]
leaderboard ─► select profiles order by points desc limit 50   [RLS profiles_select_all]
   └─ ⚠️ SEC-01: usuário pode UPDATE direto profiles.points/level (RLS não protege a coluna)
   └─ ⚠️ GAM-01: UNIQUE não deduplica quando ref_id é NULL (latente)
```

### D.7 Fluxo de Storage
```
upload ─► path = "<auth.uid()>/arquivo"   [RLS: foldername[1]=auth.uid() AND is_not_banned()]
buckets públicos (avatars/post-media/course-covers) ─► leitura direta por URL
buckets privados (videos/resources/apps) ─► leitura só authenticated; escrita moderador/admin
next/image ─► remotePatterns (Supabase host) + validação SSRF no avatar (schemas.ts)
```

### D.8 Fluxo de deploy (REAL = Hetzner)
```
git push main ─► CI (ci.yml: typecheck✓ + lint✗ + build✓)        [job quality VERMELHO por lint]
            └─► deploy.yml (Deploy Hetzner) ─► SSH ─► /opt/codex-community
                   ─► git pull --ff-only ─► docker compose build (Dockerfile standalone, PORT=3000)
                   ─► docker compose up -d ─► Caddy (80/443, Let's Encrypt) → web:3000
⚠️ DOC-01: README/PRODUCAO documentam Vercel; não há vercel.json. Decidir a fonte da verdade.
```

---

## E. Achados

### Resultado da bateria estática (executada de verdade, read-only)

| Check | Resultado | Observação |
|---|:---:|---|
| `pnpm install --frozen-lockfile` | ✅ exit 0 | lockfile ok; build script de `@sentry/cli` ignorado (source maps podem não subir). |
| `pnpm typecheck` (`tsc --noEmit`) | ✅ exit 0 | limpo — mas ver QUA-01 (typecheck é fraco por causa do `db.ts`). |
| `pnpm build` (`next build`) | ✅ exit 0 | 28 rotas, Turbopack, usa `.env.local`. |
| `pnpm lint` (`eslint`) | ❌ **exit 1** | 1 erro: `cookie-consent.tsx:14` `react-hooks/set-state-in-effect`. **Quebra o CI** (`ci.yml:27`). |

Fluxos E2E (simulados por rastreamento de código): **19 PASS / 1 PARCIAL** (FLOW-01) / 0 FALHA. Funcionalmente os caminhos felizes estão íntegros; os bloqueios são de segurança/integridade, não de funcionamento.

### Resumo por severidade
**CRÍTICO:** 2 · **ALTO:** 5 · **MÉDIO:** 9 · **BAIXO:** 9 · **COSMÉTICO:** 5.

> Legenda das colunas: **Mig** = exige migration · **Dash** = exige mudança no Dashboard Supabase/Vercel/servidor.

---

### 🔴 CRÍTICO

#### SEC-01 — `profiles_update_own` deixa o dono forjar `points`/`level` e se auto-desbanir
- **Local:** `supabase/migrations/0006_rls_policies.sql:13-17` (colunas em `0001_…:17-19`).
- **Descrição:** o `WITH CHECK` fixa apenas `role`; `is_banned`, `points` e `level` ficam livres. RLS no Postgres é por linha, não por coluna, e não há `GRANT/REVOKE` de coluna. O browser tem a anon key (`client.ts:6`); qualquer autenticado faz `PATCH /rest/v1/profiles?id=eq.<self>` e grava `is_banned=false, points=999999, level=5`, contornando a Server Action (que só envia campos seguros).
- **Impacto:** **anula toda a moderação** (`is_not_banned()` é gate de TODOS os inserts) e **corrompe o ranking/gamificação**. Não há escalada de role (role está protegido) — único atenuante.
- **Risco de regressão da correção:** médio — mexer em policy/grants de `profiles`; testar que perfil ainda edita nome/bio/avatar e que admin ainda gerencia roles/ban.
- **Reproduzir:** logado, com o `access_token`: `curl -X PATCH "$URL/rest/v1/profiles?id=eq.<id>" -H "apikey:<anon>" -H "Authorization: Bearer <jwt>" -d '{"is_banned":false,"points":999999}'` → passa.
- **Correção:** `REVOKE UPDATE` amplo + `GRANT UPDATE (full_name,username,bio,avatar_url)` para `authenticated`, **ou** trigger `BEFORE UPDATE` que rejeite alteração de `role/is_banned/points/level` salvo `is_admin()`. Pontos só via `award_points`. Patch em **G.1**.
- **Mig:** ✅ · **Dash:** ❌ · **Backup recomendado:** ✅
- *Nota de verificação:* dois verificadores adversariais divergiram (ALTO×CRÍTICO). Mantido **CRÍTICO** porque o vetor (auto-unban + fraude) é trivial, parte da anon key pública e destrói a integridade de moderação/ranking que o produto precisa antes de membros reais.

#### SEC-02 — Backdoor demo: `admin@codex.community` / `codex123!` no seed
- **Local:** `supabase/seed.sql:7-13,35,45-73`; `_seed_cloud.sql` (byte-idêntico); `docs/PROJETO.md:933` (manda colar `_seed_cloud.sql` na cloud).
- **Descrição:** 5 usuários inseridos direto em `auth.users` com a mesma senha pública `codex123!` e `email_confirmed_at=now()`; um é **admin**. Senha hardcoded no repo e nos docs.
- **Impacto:** **se o seed foi aplicado no banco que está online**, é um admin real com senha pública — comprometimento total. O `PRODUCAO.md:29` lista isso como bloqueador (B1/B8) pendente.
- **Risco de regressão:** baixo (remover dados demo) — mas **exige backup** e cuidado para não apagar dados reais já criados.
- **Reproduzir:** `/login` com `admin@codex.community` / `codex123!`.
- **Correção:** verificar no Dashboard se os usuários existem; se sim, **rotacionar senha do admin real e remover os 4 demais** (após backup). Nunca commitar `encrypted_password` fixo; criar admin via Auth API. Patch/checklist em **G.2**.
- **Mig:** ❌ · **Dash:** ✅ · **Backup recomendado:** ✅
- *Nota:* verificador rebaixou para ALTO por depender de "aplicado em cloud pública". Como você indicou que o projeto **está online**, tratamos como **CRÍTICO até prova em contrário** — é o **item nº 1** a verificar.

---

### 🟠 ALTO

#### SEC-03 — Aulas/módulos de cursos `draft` vazam (RLS `USING(true)`)
- **Local:** `0006_rls_policies.sql:140-143` (`modules_select_all`), `:154-157` (`lessons_select_all`); query `src/server/queries/courses.ts:81-85` (`select('*')` sem filtro de status).
- **Descrição:** `courses` é restrito a `status='published'`, mas `lessons`/`course_modules` usam `USING(true)`. Qualquer autenticado lê `video_url`, `video_storage_path`, `content` de aulas de cursos não publicados via PostgREST ou pela rota `/courses/[id]/lessons/[lessonId]` (que não checa o curso pai).
- **Impacto:** vazamento do ativo central de um LMS (conteúdo não lançado/pago). Atenuante: exige conhecer o UUID (não enumerável).
- **Reproduzir:** `GET $URL/rest/v1/lessons?select=*` retorna aulas de cursos draft.
- **Correção:** trocar as policies por `EXISTS(select 1 from courses c where c.id=course_id and (c.status='published' or is_moderator()))` e filtrar status em `getLessonForViewer`. Patch em **G.3**.
- **Mig:** ✅ · **Dash:** ❌ · **Backup:** recomendável (alteração de policy).

#### SEC-04 — Auth redirect/Site URL do Supabase **cloud** precisa apontar para o domínio real
- **Local:** Dashboard Supabase (allowlist), reflexo local em `config.toml:39-40`.
- **Descrição:** a app monta `emailRedirectTo`/`redirectTo` a partir de `NEXT_PUBLIC_APP_URL` (`auth.ts:14,55,83,103`) — correto. Mas o **allowlist do projeto cloud** (Site URL + Additional Redirect URLs) vive no Dashboard; se não incluir o domínio de produção, confirmação/reset de e-mail quebram. `env.ts:28-32` já alerta se `APP_URL` for localhost em prod.
- **Impacto:** e-mails de confirmação/reset apontando para URL inválida → onboarding quebrado.
- **Correção:** no Dashboard cloud, setar Site URL e Redirect URLs (`https://<domínio>/**` e `…/auth/callback`) e garantir `NEXT_PUBLIC_APP_URL=https://<domínio>` no ambiente. Checklist em **G.4**.
- **Mig:** ❌ · **Dash:** ✅
- *Nota:* a alegação original de que `config.toml` (localhost) quebraria os e-mails foi **refutada** na verificação adversarial — `config.toml [auth]` governa só a stack local do CLI; a fonte da verdade em produção é o Dashboard. Severidade ajustada de "config.toml ALTO" para este item de Dashboard.

#### QUA-01 — `types/db.ts` é stub manual com `Insert/Update: any` → escrita sem type-check
- **Local:** `src/types/db.ts:228-271`.
- **Descrição:** `GenericTable<Row>` define `Insert: any`/`Update: any` e `Functions/Views/Enums: any`. Todo `.insert/.update/.upsert` e RPC passa sem verificação; gera **143 casts `as string|number|boolean`** nas pages (mascarando nullability). Comentário do arquivo afirma (falsamente) que "as queries continuam tipadas".
- **Impacto:** erros de coluna/enum/NOT NULL só aparecem em runtime; refactor de schema não quebra o build; falsa sensação de type-safety.
- **Reproduzir:** trocar um `.insert` por coluna inexistente → `pnpm typecheck` compila.
- **Correção:** `pnpm db:types` (script já existe) e commitar os tipos gerados; no mínimo `Insert/Update: Partial<Row>` e corrigir o comentário. Patch em **G.6**.
- **Mig:** ❌ · **Dash:** ❌

#### DOC-01 — Docs dizem "deploy Vercel", mas a infra configurada é **Hetzner (Docker+Caddy)**
- **Local:** `README.md:30,232-240` e `docs/PRODUCAO.md` (Vercel) × `.github/workflows/deploy.yml:1` ("Deploy (Hetzner)"), `Dockerfile`, `docker-compose.yml`, `Caddyfile`. **Não há `vercel.json`.**
- **Descrição:** o pipeline real faz SSH para `/opt/codex-community` e roda `docker compose build/up`; runtime na **porta 3000** atrás do Caddy. Contradiz a premissa de "online na Vercel" e os passos B3/B4 do PRODUCAO.
- **Impacto:** quem seguir os docs configura o ambiente errado (env, redirect URLs vercel.app) e diverge do deploy efetivo.
- **Correção:** decidir a fonte da verdade (Hetzner como primário e Vercel como alternativa, ou remover a infra não usada) e atualizar README/PRODUCAO. Sem patch de código (decisão + doc).
- **Mig:** ❌ · **Dash:** ✅ (clareza de ambiente)

---

### 🟡 MÉDIO

| ID | Local | Descrição / Impacto | Reproduzir | Correção | Mig/Dash |
|---|---|---|---|---|---|
| **SEC-05** | `src/server/actions/admin.ts:32-53` | Checagem de "último admin"/ban é **read-then-write** sem transação (TOCTOU). Dois rebaixamentos concorrentes podem zerar admins → lockout total. | Disparar 2 `setMemberRole` simultâneos rebaixando admins diferentes. | Mover regra para função `SECURITY DEFINER` transacional (ou constraint/trigger "≥1 admin"). G.7 | Mig ✅ |
| **SEC-06** | `lessons.is_free` (`0003:52`) nunca aplicado | Coluna sugere gating de conteúdo, mas nenhuma policy/query usa `is_free`; todo conteúdo de aula publicada é acessível a qualquer membro. Perda de receita se houver paywall. | Aula `is_free=false` em curso publicado é servida normalmente. | Definir regra de negócio: aplicar `is_free`/nível na policy de `lessons`, ou remover a coluna. | Mig ✅ |
| **SEC-07** | `vercel.txt:1-6` + `.gitignore:33-38` | 6 strings tipo-token (`8hex-8hex`) commitadas e **fora do `.gitignore`** (ignora `.env*`, não `vercel.txt`). Possível vazamento de segredo. | Abrir `vercel.txt`. | Confirmar o que são; se segredos, **rotacionar** e remover do histórico (`git filter-repo`) + adicionar ao `.gitignore`; senão, apagar. | Dash ✅ |
| **PERF-01** | `src/server/queries/courses.ts:12`, `dashboard.ts:12` | `from('lessons').select('id,course_id')` **sem filtro** — carrega TODAS as aulas da plataforma a cada render de `/dashboard` e `/courses`. Cresce O(total de aulas). | Popular muitas aulas e observar o payload. | `.in('course_id', publishedIds)` ou agregação no banco (view/RPC `count(*) group by course_id` ou coluna desnormalizada). | — |
| **DOC-02** | `config.toml:49` × `auth.ts:60` / `PROJETO.md` | `enable_confirmations=false` (local) vs código/docs afirmando confirmação ON. Comportamento de cadastro diverge local×cloud (branch `pending` nunca dispara local). | Comparar as linhas. | Alinhar config↔docs e documentar explicitamente a diferença local×cloud. | Dash ✅ |
| **DOC-03** | `Dockerfile:30` (PORT=3000) × tudo (3004) | Container roda na **3000**; package.json/config/env/`api/health` usam **3004**. `/api/health` retorna `{port:3004}` fixo mesmo servido na 3000. | Comparar Dockerfile/compose com `api/health/route.ts`. | Padronizar porta ou tornar `/api/health` dinâmico (`process.env.PORT`). | — |
| **DOC-04** | `README.md:273,276`; `PRODUCAO.md` I8; `PLAYBOOK §9` | Docs dizem "sem testes" e "notificações automáticas não plugadas", mas **existe** suíte Playwright e **migration 0008** (triggers). Risco de retrabalho/triggers duplicados. | Comparar docs com `e2e/` e `0008_…sql`. | Atualizar README/PRODUCAO/PLAYBOOK. | — |
| **CI-01** | `ci.yml:27` + `cookie-consent.tsx:14` | `pnpm lint` falha (`set-state-in-effect`) → **job `quality` do CI vermelho** a cada push. Cultura de "CI verde" quebrada. | Rodar `pnpm lint`. | Corrigir o efeito (checar `localStorage` fora do setState síncrono / guard). G.8 | — |
| **UX-01** | `src/app/page.tsx:80,214` | Landing exibe "Plataforma própria · em beta" e rodapé "CODEX Community · MVP" — mina confiança para público B2B premium. | Abrir `/`. | Neutralizar o badge e remover "MVP" do rodapé. | — |
| **UX-02** | `admin/courses/page.tsx:50`, `admin/posts/page.tsx:34` | Badges mostram valor cru em inglês (`published`/`draft`, slug de categoria) em UI toda PT-BR. | Abrir `/admin/courses` e `/admin/posts`. | Mapear para rótulo PT-BR (reusar `POST_CATEGORIES`). | — |

### 🟢 BAIXO

| ID | Local | Descrição | Correção | Mig |
|---|---|---|---|---|
| **SEC-08** | `courses.ts:110-134` | `markLessonComplete` não valida que a aula pertence ao curso nem que está publicado → marca/pontua qualquer aula (inclui draft, +15 pts). | Validar relação aula→curso e `status='published'` antes do upsert. | — |
| **SEC-09** | `resources-apps-events.ts:135-137` | Pontos de RSVP (`event_attended +20`) não são estornados ao mudar status para `declined`. Garante 20 pts dando "going" 1×. | Pontuar só presença confirmada, ou estornar via função `SECURITY DEFINER`. | — |
| **GAM-01** | `0005:15-16` | `UNIQUE(user,action,ref_type,ref_id)` não deduplica quando `ref_id` é NULL (NULL≠NULL no Postgres). Latente (callers atuais passam ref não-nulo). | `COALESCE` em índice único ou exigir `ref_id NOT NULL`. | ✅ |
| **QUA-02** | `posts.ts:14`, `courses.ts:10`, etc. | 6 definições / 3 nomes para o mesmo retorno (`Result`/`ActionResult`/`ActionState`). | Centralizar `type ActionResult` em módulo compartilhado. | — |
| **QUA-03** | `admin/*/…-actions.tsx` | 4 `Delete*Inline` quase idênticos (só muda a action e 3 strings). | `DeleteInline` genérico recebendo a action como prop. | — |
| **QUA-04** | 5 Composers admin | Padrão `useState(form)+update<K>+FormData` repetido (helper `update<K>` idêntico em 5 arquivos). | Hook `useFormState(initial)` + `<FieldGrid>`. | — |
| **DEAD-01** | `constants.ts:64-70` | `levelFromPoints()` é **dead code** e duplica `recalc_level` (SQL) → risco de divergência de thresholds. | Remover; derivar de `LEVEL_THRESHOLDS` se precisar no client. | — |
| **DEAD-02** | `components/shared/confirm-dialog.tsx` | `ConfirmDialog` **não é usado** (duplica `ConfirmDeleteIconButton`). | Remover ou unificar. | — |
| **ENV-01** | `.gitignore:35` | `!.env.example` esperado mas o arquivo **não existe**; sem template de env versionado (fricção de setup). | Criar `.env.example` com nomes (sem valores). | — |
| **DOC-05** | `README.md:93-94`; `PRODUCAO.md:22` | README diz "7 SQLs" (são 8); PRODUCAO marca backup/termos/privacidade pendentes, mas já existem (`scripts/backup.sh`, `(legal)/termos`, `(legal)/privacidade`). | Atualizar contagem e checklist. | — |
| **FLOW-01** | `resources-apps-events.ts:14` | `createResource` usa `requireModerator` enquanto a UI é admin-only — inconsistência de design (não falha de segurança). | Alinhar gating action↔página (decidir se recurso é admin ou moderador). | — |
| **UX-03** | `not-found.tsx:9-11` | 404 sempre leva à landing pública, mesmo logado (desorienta). | CTA "Ir para o painel" → `/dashboard`. | — |
| **UX-04** | `(app)/error.tsx`, `admin/error.tsx` | Boundaries de erro só "Tentar novamente", sem rota de fuga nem suporte. | Adicionar link "Voltar ao início" + contato. | — |
| **UX-05** | `admin/page.tsx:49-95` | Overview admin só-leitura: cards de número sem link nem CTAs de ação. | Cards clicáveis + faixa "Ações rápidas". | — |
| **UX-06** | `(app)/dashboard/page.tsx:90-95,160-170` | Sem onboarding/primeiros passos; empty states de cursos/eventos sem ação → risco de abandono no D0. | Card de boas-vindas/checklist + CTAs nos empty states. | — |

### ⚪ COSMÉTICO
- **EmptyState do admin** sem `description`/`action` (apps/events/resources) — `empty-state.tsx`.
- **Sino de notificações** sem badge de não-lidas — `header.tsx:77-81`.
- **Navegação mobile duplicada** (Sheet + MobileNav inferior) — `header.tsx:26-66` + `mobile-nav.tsx`.
- **Badge "X aulas concluídas"** sem total (sem `X/N` nem barra) — `dashboard/page.tsx:104-106`.
- **Naming**: uniformemente "CODEX Community" (✅ **não há "Portal Nexus"** em nenhum lugar); só variação de caixa `codex-community`/`CODEX COMMUNITY`.

---

## F. Plano de ação recomendado (apenas proposto — não implementar agora)

### Fase 1 — Produção segura (owner, admin, Auth, emails, dados demo)
1. **Backup do banco** (Dashboard → Database → Backups, ou `scripts/backup.sh`) antes de qualquer SQL.
2. **SEC-02**: verificar e neutralizar usuários demo; rotacionar senha do admin real.
3. **SEC-01 + SEC-05**: aplicar G.1 (column grant + RPCs `admin_set_role`/`admin_set_banned`) e refatorar `admin.ts`.
4. **Owner absoluto**: aplicar G.5 (flag `is_owner` + imunidade) junto com SEC-01.
5. **SEC-03**: aplicar G.3 (policies de `lessons`/`modules` por status do curso).
6. **SEC-04 + DOC-02**: configurar Auth no Dashboard cloud (Site URL/Redirects, confirmações) e fixar `NEXT_PUBLIC_APP_URL`.
7. **SEC-07**: investigar/rotacionar/remover `vercel.txt`.
8. **CI-01**: corrigir `cookie-consent.tsx` (G.8) para destravar o CI.
9. **DOC-01**: decidir e documentar o deploy real (Hetzner × Vercel).

### Fase 2 — Conteúdo mínimo
- SEC-06/SEC-08 (definir regra de `is_free` + validar aula↔curso); seed de conteúdo real (1 post, 1 curso, 3 recursos, 3 apps, 1 evento); `.env.example` (ENV-01); QUA-01 (`pnpm db:types`).

### Fase 3 — UX/UI
- UX-01 (linguagem MVP/beta), UX-02 (badges PT-BR), UX-05/UX-06 (overview admin + onboarding), UX-03/UX-04 (404/erros), cosméticos.

### Fase 4 — Operação, monitoramento e automações
- SEC-09/GAM-01 (integridade de gamificação), PERF-01 (queries de aulas), agendar `backup.sh` (cron), Sentry (aprovar build script `@sentry/cli`), QUA-02/03/04 + DEAD-01/02 (refactor/limpeza), DOC-03/04/05 (sincronizar docs).

---

## G. Apêndice — Correções prontas (⚠️ **NÃO APLICADAS** — referência para a Fase 1)

> Todos os blocos abaixo são propostas. **Não execute nesta etapa.** Antes de qualquer SQL: **faça backup**. Teste em staging/local (`pnpm db:reset`) antes da cloud.

### G.1 — SEC-01 (+ SEC-05): travar colunas sensíveis de `profiles`
**Estratégia:** privilégio por coluna para o papel `authenticated` (usuário comum) + gravações privilegiadas via funções `SECURITY DEFINER`. `award_points` já é definer (escreve `points/level` sem depender do grant); a gestão de role/ban migra para RPCs transacionais (corrige também o TOCTOU do SEC-05).
```sql
-- ⚠️ NÃO APLICADO — Fase 1. Backup antes.
-- 1) Usuário comum só altera colunas de vitrine do próprio perfil:
revoke update on public.profiles from authenticated;
grant update (full_name, username, bio, avatar_url) on public.profiles to authenticated;

-- 2) Role/ban via RPC SECURITY DEFINER (admin), transacional:
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void language plpgsql security definer set search_path = public as $$
declare v_admins int;
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_role not in ('admin','moderator','member') then raise exception 'role inválida'; end if;
  if p_user = auth.uid() and p_role <> 'admin' then raise exception 'não pode remover o próprio admin'; end if;
  perform 1 from public.profiles where role = 'admin' for update;            -- lock atômico
  if p_role <> 'admin' and (select role from public.profiles where id = p_user) = 'admin' then
    select count(*) into v_admins from public.profiles where role = 'admin';
    if v_admins <= 1 then raise exception 'não pode remover o último admin'; end if;
  end if;
  update public.profiles set role = p_role where id = p_user;
end; $$;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void language plpgsql security definer set search_path = public as $$
begin
  if not public.is_admin() then raise exception 'forbidden'; end if;
  if p_user = auth.uid() then raise exception 'não pode banir a si mesmo'; end if;
  if p_banned and (select role from public.profiles where id = p_user) = 'admin' then
    raise exception 'não pode banir outro admin'; end if;
  update public.profiles set is_banned = p_banned where id = p_user;
end; $$;
```
**Mudança em `src/server/actions/admin.ts` (não aplicada):** trocar os `supabase.from('profiles').update(...)` por `supabase.rpc('admin_set_role', { p_user, p_role })` e `supabase.rpc('admin_set_banned', { p_user, p_banned })` (as guardas saem do TS e passam a viver no banco, atômicas).
> **Por que `award_points` continua funcionando:** é `SECURITY DEFINER` (executa como dono/postgres), logo ignora o `grant` de `authenticated` ao escrever `points/level`.
> **Alternativa (se não quiser mexer no `admin.ts` agora):** trigger `BEFORE UPDATE` que rejeita mudança de `role/is_banned/points/level` salvo `is_admin()` — porém exige liberar `award_points` via flag de sessão (`set_config('app.allow_points',...)`); mais frágil que o grant.

### G.2 — SEC-02: neutralizar o backdoor demo (checklist, com backup)
```text
⚠️ NÃO APLICADO. Operação sensível — backup obrigatório.
1. Backup do banco (Dashboard → Database → Backups).
2. Verificar existência:   select id, email, role from auth.users
      join public.profiles using (id) where email like '%@codex.community';
3. Se o admin real JÁ existe com outro e-mail → apenas REMOVER os demos:
      -- delete from auth.users where email in
      --   ('admin@codex.community','mod@codex.community','ana@codex.community',
      --    'bruno@codex.community','clara@codex.community');
   (cascata remove profiles/posts demo via ON DELETE CASCADE — confira o que é demo vs real antes!)
4. Se ainda não há admin real → criar via Supabase Auth (Dashboard → Authentication → Add user),
   depois: update public.profiles set role='admin' where id='<novo-uuid>'; e só então remover os demos.
5. NUNCA reaplicar seed.sql/_seed_cloud.sql em produção. Tornar o seed só-local (ou remover senhas fixas).
```

### G.3 — SEC-03: fechar leitura de aulas/módulos de cursos `draft`
```sql
-- ⚠️ NÃO APLICADO — Fase 1.
drop policy if exists "modules_select_all" on public.course_modules;
create policy "modules_select_published_or_mod" on public.course_modules
  for select to authenticated using (
    exists (select 1 from public.courses c
            where c.id = course_modules.course_id
              and (c.status = 'published' or public.is_moderator())));

drop policy if exists "lessons_select_all" on public.lessons;
create policy "lessons_select_published_or_mod" on public.lessons
  for select to authenticated using (
    exists (select 1 from public.courses c
            where c.id = lessons.course_id
              and (c.status = 'published' or public.is_moderator())));
```
**+ Defesa em profundidade (não aplicada)** em `src/server/queries/courses.ts` (`getLessonForViewer`): filtrar `status='published'` do curso pai (join) antes de servir a aula.

### G.4 — SEC-04: Auth do Supabase cloud (Dashboard, sem SQL)
```text
⚠️ NÃO APLICADO — ação no Dashboard.
Authentication → URL Configuration:
  Site URL:               https://<seu-dominio>
  Additional Redirect URLs: https://<seu-dominio>/**  e  https://<seu-dominio>/auth/callback
Authentication → Providers → Email: definir se "Confirm email" fica ON (alinhar com DOC-02).
Ambiente (Hetzner .env / Vercel env): NEXT_PUBLIC_APP_URL=https://<seu-dominio>
Validar: env.ts:28-32 deixa de emitir o warning de localhost-em-produção.
```

### G.5 — Owner absoluto (proposta de encaixe sem quebrar o sistema)
**Decisão de design recomendada:** adicionar uma flag ortogonal `is_owner` em `profiles` (NÃO adicionar `'owner'` ao enum `role`). O owner **mantém `role='admin'`**, então todas as policies de admin existentes (`is_admin()`, `profiles_admin_all`, etc.) continuam valendo sem alteração; o owner ganha apenas **imunidade** (não pode ser banido/rebaixado por outros admins) e privilégios exclusivos (ex.: transferir titularidade). Menor churn e menor risco de regressão.
```sql
-- ⚠️ NÃO APLICADO — Fase 1 (aplicar junto com G.1).
alter table public.profiles add column if not exists is_owner boolean not null default false;
-- Marcar exatamente 1 dono (mantém role='admin'):
-- update public.profiles set is_owner = true, role = 'admin' where id = '<uuid-do-dono>';

create or replace function public.is_owner()
returns boolean language sql stable security definer set search_path = public as $$
  select exists(select 1 from public.profiles
                where id = auth.uid() and is_owner = true and is_banned = false);
$$;

-- Imunidade do owner: incluir no início de admin_set_role/admin_set_banned (G.1):
--   if (select is_owner from public.profiles where id = p_user) and not public.is_owner()
--   then raise exception 'o owner é protegido'; end if;
-- E impedir mais de um owner / só o owner promove owner:
--   if p_set_owner and not public.is_owner() then raise exception 'só o owner transfere titularidade'; end if;
```
> Garantir unicidade com índice parcial (opcional): `create unique index one_owner on public.profiles(is_owner) where is_owner;`

### G.6 — QUA-01: gerar tipos reais do banco
```bash
# ⚠️ NÃO APLICADO. Requer supabase login + link ao projeto (ou DB local rodando).
pnpm db:types        # = supabase gen types typescript --local > src/types/db.ts
# Commitar o arquivo gerado, removendo o stub manual e o comentário enganoso.
# Fallback mínimo se mantiver stub: trocar `Insert: any`/`Update: any` por `Partial<Row>`.
```

### G.7 — SEC-05: ver G.1 (as RPCs `admin_set_role`/`admin_set_banned` já resolvem o TOCTOU com `FOR UPDATE`).

### G.8 — CI-01: corrigir `cookie-consent.tsx` (destrava o CI)
```diff
// src/components/shared/cookie-consent.tsx  — ⚠️ NÃO APLICADO
  useEffect(() => {
-   try {
-     if (!localStorage.getItem(KEY)) setShow(true);
-   } catch { /* localStorage indisponível */ }
+   const id = requestAnimationFrame(() => {
+     try { if (!localStorage.getItem(KEY)) setShow(true); } catch { /* indisponível */ }
+   });
+   return () => cancelAnimationFrame(id);
  }, []);
```
> Evita o `setState` síncrono dentro do efeito (`react-hooks/set-state-in-effect`), removendo o único erro de `pnpm lint`.

---

## Metodologia, limitações e guardrails

**Como foi feito:** leitura direta de todos os arquivos-núcleo (migrations 0001–0008, `proxy.ts`, todas as Server Actions, helpers de auth/RLS, `env.ts`, `next.config.ts`, `config.toml`, seed, Dockerfile/compose/Caddyfile, CI/deploy), bateria estática real (`install/lint/typecheck/build`) e workflow de 11 agentes com **verificação adversarial** (cada achado CRÍTICO/ALTO foi confrontado por um verificador cético — isso ajustou SEC-04 de "ALTO config.toml" para um item de Dashboard, e calibrou as severidades de SEC-01/SEC-02/SEC-03).

**Limitações desta auditoria (transparência):**
- **E2E não executado**: os 20 fluxos foram validados por rastreamento de código (decisão acordada: não tocar produção nem subir Supabase). Recomenda-se rodar `pnpm test:e2e` em ambiente local/staging na Fase 2.
- **Estado do banco em produção não inspecionado**: não foi possível confirmar se `_seed_cloud.sql` foi aplicado no banco online (por isso SEC-02 é "CRÍTICO até verificação"). **Ação nº 1 da Fase 1.**
- **`.env.local`/`.env.example` não lidos** (negados por sandbox / inexistentes) — inventário de env feito por referências no código.

**Guardrails respeitados nesta etapa:** nenhuma correção implementada · nenhum SQL executado · nenhum arquivo removido · roles/envs/dados de produção intocados · nenhum deploy · todos os patches marcados `NÃO APLICADO`. Único arquivo criado: este documento.

**Antes de mexer no banco (Fase 1):** sempre **backup** primeiro; aplicar e testar em local (`pnpm db:reset`) antes da cloud; aplicar na ordem do bloco "⚡ O que corrigir primeiro".

---
*Documento gerado pela auditoria baseline de 2026-06-14. Serve como ponto de partida para qualquer humano ou IA antes de modificar o código. Mantê-lo atualizado a cada mudança estrutural.*
