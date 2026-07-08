# AUDITORIA PÓS-RELEASE — BASELINE OFICIAL

**Data:** 2026-07-08
**Escopo:** Portal Nexus (COMUNIDADE / codex-community)
**Método:** evidência direta em código, migrations, git e gates executados localmente. Cada item classificado como VERIFICADO / INFERIDO / NÃO VERIFICÁVEL.

---

## 1. Baseline Git — VERIFICADO

| Item | Valor |
|---|---|
| Branch | `master` |
| HEAD | `fea4992` — "fix(migration): 0035 idempotente (drop policy if exists) p/ re-execucao na cloud" |
| Working tree | Limpa (`git status` sem alterações) |
| Sincronização | `master` == `origin/master` (sem ahead/behind) |
| Remote | `https://github.com/SaaMuuRaaY/COMUNIDADE.git` |
| Tags | Nenhuma |
| `git diff --check` | OK (sem whitespace errors) |

Últimos commits: `fea4992`, `3b08e24` (callback onboarding + a11y), `439b90b` (deep-link onboarding), `77b7f52` (guard XSS URLs), `a672831` (intercepting routes Biblioteca).

## 2. Baseline de produção — INFERIDO

- Não há acesso direto à Vercel nesta auditoria (sem `vercel.json` no repo; configuração via dashboard = NÃO VERIFICÁVEL).
- Como `master` local == `origin/master` e o deploy Vercel acompanha `master`, **infere-se produção == HEAD `fea4992`**.
- Nota: notas internas anteriores diziam que Features A/B/C/D estavam "commitadas local SEM deploy" — isso está **DESATUALIZADO**: tudo foi pushado para `origin/master`.
- Build Docker alternativo existe (`DOCKER_BUILD=1` → `output: standalone`, next.config.ts:100) — infra Hetzner, NÃO VERIFICÁVEL daqui.

## 3. Toolchain e dependências — VERIFICADO

| Item | Versão |
|---|---|
| Node | v24.14.1 |
| pnpm | 10.12.4 |
| Next.js | 16.2.6 (App Router; `proxy.ts` substitui middleware) |
| React / React DOM | 19.2.4 |
| TypeScript | ^5 (estrito, `tsc --noEmit` limpo) |
| Tailwind CSS | ^4 (@tailwindcss/postcss) |
| @supabase/supabase-js | ^2.106.2 |
| @supabase/ssr | ^0.10.3 |
| @sentry/nextjs | ^10.57.0 |
| @tanstack/react-query | ^5.100.14 |
| zod | ^4.4.3 |
| react-hook-form | ^7.77.0 + @hookform/resolvers |
| react-markdown | ^10.1.0 + rehype-sanitize + remark-gfm |
| Radix UI | avatar, dialog, dropdown, popover, select, tabs, toast, tooltip, etc. |
| @playwright/test | ^1.60.0 |

Scripts: `dev` (porta 3004), `build`, `start`, `lint`, `typecheck`, `db:start/stop/reset/types`, `test:e2e`, `test:e2e:ui`.

## 4. Resultado dos gates — VERIFICADO (executados em 2026-07-08 sobre HEAD fea4992)

```text
pnpm typecheck  → exit 0
pnpm lint       → exit 0
pnpm build      → exit 0 (✓ Compiled successfully in 5.4s)
git diff --check → OK
git status      → limpo
pnpm test:e2e   → NÃO EXECUTADO (deliberado)
```

**Justificativa do E2E não executado:** a suíte Playwright roda contra o Supabase **cloud** (dados reais). Executá-la violaria a regra "não alterar dados reais / não alterar produção" desta auditoria. Cobertura avaliada por leitura estática dos specs (ver AUDIT_POST_RELEASE_TECHNICAL.md §Testes).

## 5. Baseline de banco — VERIFICADO (por leitura das migrations)

- **35 migrations** (`0001` … `0035`), ordem íntegra, idempotência via `DROP ... IF EXISTS` / `CREATE OR REPLACE` nas migrations que reescrevem policies (0010, 0014, 0017, 0018, 0020, 0031, 0035).
- **~30 tabelas** (profiles, communities, community_members, posts, post_comments, post_likes, post_reactions, courses, course_modules, lessons, lesson_progress, lesson_comments, resources, apps, events, event_attendees, points_ledger, notifications, settings, chat_messages, direct_messages, dm_conversations, dm_blocks, dm_reports, saved_posts, follows, friendships, member_onboarding, rewards, community_migration_backup).
- **RLS habilitada em todas as tabelas** (incl. `community_migration_backup` desde 0035).
- **~28 funções/RPCs**; `award_points` com lockdown confirmado (0031: REVOKE public/anon/authenticated, GRANT service_role). RPCs administrativas (`admin_adjust_points`, `admin_set_role`, `admin_set_banned`) são SECURITY DEFINER com guarda `is_admin()` interna.
- **7 buckets de storage** (avatars, post-media, videos, resources, apps, course-covers, content-covers) com policies por papel.
- **~15 triggers** (updated_at, notificações, award/revert de pontos incl. hard-delete 0035).
- **Tipos gerados** (`src/types/database.generated.ts`) sincronizados com as 35 migrations — nenhuma divergência encontrada.
- **Estado cloud**: aplicação das migrations na cloud é NÃO VERIFICÁVEL daqui; notas de release indicam 0001–0034 aplicadas e **0035 pendente de aplicação na cloud** (motivo do commit HEAD ser o fix de idempotência da 0035). CONFIRMAR MANUALMENTE no Dashboard antes do próximo ciclo.

## 6. Baseline de rotas — VERIFICADO (76 arquivos page/layout/route)

- **(auth)**: /login, /register, /forgot-password
- **auth/callback** (route handler)
- **(app)** — shell autenticado: /dashboard, /community (+ /c/[channel], /[postId], /regras, /faq), 13 canais com URL na raiz (/comece-por-aqui, /apresente-se, /comunicados, /duvidas-gerais, /agentes, /rotinas, /suporte-tecnico, /marketing-e-vendas, /compartilhe-seu-projeto, /vagas-e-oportunidades, /parcerias-e-colaboracoes, /cupons-e-descontos, /lives-e-encontros), /post/[postId], /chat-e-networking, /mensagens (+ [conversationId]), /notifications, /salvos, /conexoes, /members/[userId], /profile, /courses (+ [courseId] + lessons/[lessonId]), /resources (+ @modal intercepting routes), /apps (+ @modal), /calendar, /leaderboard, /rewards, /onboarding, /support/report
- **(content)** — preview público: /resources/[slug], /apps/[slug]
- **(legal)**: /termos, /privacidade
- **admin**: /, /members, /posts, /courses (+ new + [courseId]/edit), /resources, /apps, /events, /rewards, /reports (+ [conversationId]), /settings
- **api**: /api/health
- Raiz: `/` (landing), /banned, not-found, global-error

## 7. Baseline de código — VERIFICADO

- 218 arquivos `.ts/.tsx` em `src/`; 68 com `"use client"` (~31%).
- Estrutura: `src/app` (rotas), `src/components` (ui, shared, layout, community, chat, direct, connections, notifications, library, resources, courses, calendar, nexus), `src/server` (server actions / data access), `src/lib`, `src/types`, `src/styles`.
- Guard de autenticação: `proxy.ts` (raiz) — rotas públicas explícitas, redirect para /login, guarda /admin (role admin + não banido).
- Segurança HTTP: CSP + HSTS + X-Frame-Options etc. em `next.config.ts:44-52`; `Cache-Control: no-store` em /admin.
- Observabilidade: Sentry via `instrumentation.ts` / `instrumentation-client.ts` / `global-error.tsx`.

## 8. Baseline de testes — VERIFICADO (inventário estático)

- `e2e/`: 7 specs (`public`, `member`, `member-full`, `admin`, `admin-content`, `members-admin`) + `fixtures.ts`, `auth.setup.ts`, `admin-client.ts`, `global-setup.ts`, `global-teardown.ts`.
- Sem testes unitários ou de integração fora do Playwright.
- Detalhe de cobertura na matriz do AUDIT_POST_RELEASE_TECHNICAL.md.

## 9. Baseline de configuração/variáveis

- Necessárias (VERIFICADO por uso no código): `NEXT_PUBLIC_SUPABASE_URL`, `NEXT_PUBLIC_SUPABASE_ANON_KEY`, `SUPABASE_SERVICE_ROLE_KEY` (server-only), DSN Sentry (via instrumentation), `DOCKER_BUILD` (opcional).
- **Não há `.env.example` no repo** (achado registrado na auditoria técnica).
- `vercel.json` ausente — configuração na plataforma (NÃO VERIFICÁVEL).

## 10. Feature flags, redirects e integrações

- Sem sistema de feature flags (VERIFICADO — nenhum encontrado).
- Redirects: pós-auth via `redirectedFrom`/`next` (auth callback), canais antigos `?category=` migrados na 0015 (histórico).
- Integrações externas: Supabase (auth/db/storage/realtime), Sentry, Vercel (deploy), embeds permitidos por CSP (YouTube, Vimeo, Loom, Google Docs, CodePen, CodeSandbox, GitHub).

---

*Documento gerado pela auditoria pós-release de 2026-07-08. Nenhuma alteração de código, banco ou deploy foi realizada.*
