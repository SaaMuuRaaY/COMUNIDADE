# CODEX Community — Documentação Principal

> Documento de referência único do projeto. Tudo que importa para entender, manter e expandir o produto vive aqui.

**Última atualização:** 2026-05-31
**Versão do MVP:** 0.1.0
**Status:** Funcionando em Supabase Cloud (projeto `yagjnowggkqvjrnysihi`)

---

## Sumário

1. [Contexto e ideia](#1-contexto-e-ideia)
2. [Mapa funcional — abas e estrutura](#2-mapa-funcional--abas-e-estrutura)
3. [Stack e decisões técnicas](#3-stack-e-decisões-técnicas)
4. [Hierarquia de arquivos — ordem de leitura](#4-hierarquia-de-arquivos--ordem-de-leitura)
5. [Arquitetura — diagramas](#5-arquitetura--diagramas)
6. [Modelo de dados](#6-modelo-de-dados)
7. [Fluxos críticos](#7-fluxos-críticos)
8. [Auditoria técnica](#8-auditoria-técnica)
9. [Lembretes, ajustes e roadmap](#9-lembretes-ajustes-e-roadmap)
10. [Comandos e troubleshooting](#10-comandos-e-troubleshooting)

---

## 1. Contexto e ideia

### Problema
Comunidades digitais hoje dependem de Skool, Circle, Discord, Mighty Networks. Essas plataformas:
- Não são propriedade do criador (regras mudam, contas podem ser banidas)
- Não permitem customização profunda
- Cobram percentual sobre receita
- Misturam comunidade + curso + recursos em UX fragmentada

### Solução
**CODEX Community** = plataforma **própria**, monólito moderno Next.js, que une numa única interface:

```
┌─────────────────────────────────────────────────────┐
│              CODEX COMMUNITY                        │
│                                                     │
│  Comunidade   Cursos    Recursos   Apps   Eventos   │
│  (feed)       (vídeo)   (PDFs)     (links) (RSVP)   │
│                                                     │
│         Gamificação (pontos · níveis)               │
│         Painel admin · Multi-papel                  │
└─────────────────────────────────────────────────────┘
```

### Público
- Criadores de conteúdo / educadores
- Mentores e coaches
- Comunidades B2B (ex: lojistas Nexus — caso de uso original do NEXUS)

### Posicionamento no ecossistema NEXUS
CODEX vive em `c:\Users\ASUS\Desktop\NEXUS\COMUNIDADE\` como **módulo independente registrado no HUB**. Roda na **porta 3004** e é orquestrado pelo HUB (porta 4000) junto com os outros 4 módulos Nexus.

```
NEXUS HUB (4000) ──orchestra──┬─→ NEXUS ADS    (3000)
                              ├─→ LEAD PIPELINE     (3001/3099)
                              ├─→ CALCULADORA       (3002)
                              ├─→ CSE Reels         (3003)
                              ├─→ CODEX COMMUNITY   (3004)  ← este projeto
                              └─→ NEXUS HEAD   (8080)
```

### Objetivo do MVP
Validar end-to-end o ciclo: **cadastro → publicar → consumir curso → ganhar pontos → admin gerenciar**, com path claro para monetização, mobile e IA no futuro.

---

## 2. Mapa funcional — abas e estrutura

### 2.1 Visão de alto nível das áreas

```
┌─────────────────────────────────────────────────────────────┐
│ PÚBLICA                                                     │
│ /            Landing (preview de cursos + posts)            │
│ /login       Entrada                                        │
│ /register    Cadastro                                       │
│ /forgot-…    Recuperar senha                                │
├─────────────────────────────────────────────────────────────┤
│ MEMBRO (autenticado · qualquer role)                        │
│ /dashboard   Resumo: cursos · eventos · feed · pontos       │
│ /community   Feed + composer + filtros + busca              │
│ /community/[postId]  Detalhe + comentários                  │
│ /courses     Listagem com progresso                         │
│ /courses/[id]  Detalhe → módulos → aulas                    │
│ /courses/[id]/lessons/[id]  Player + marcar concluída       │
│ /resources   Biblioteca de PDFs/templates/planilhas         │
│ /apps        Biblioteca de ferramentas (link/embed/file)    │
│ /calendar    Eventos + RSVP                                 │
│ /leaderboard Top 50                                         │
│ /profile     Edição do próprio perfil                       │
│ /members/[id]  Perfil público                               │
│ /notifications  Caixa de notificações                       │
├─────────────────────────────────────────────────────────────┤
│ ADMIN (role = admin)                                        │
│ /admin                Visão geral (7 KPIs + próximos events)│
│ /admin/courses        CRUD cursos                           │
│ /admin/courses/new    Criar curso                           │
│ /admin/courses/[id]/edit  Editar + módulos + aulas          │
│ /admin/posts          Moderar posts                         │
│ /admin/resources      CRUD recursos                         │
│ /admin/apps           CRUD apps                             │
│ /admin/events         CRUD eventos                          │
│ /admin/members        Papel + ban                           │
│ /admin/settings       Nome · descrição · cor · visibility   │
└─────────────────────────────────────────────────────────────┘
```

### 2.2 Componentes de UI por contexto

```
LAYOUT INTERNO
┌──────────┬────────────────────────────────────┐
│ Sidebar  │ Header (busca futura + avatar)     │
│ desktop  ├────────────────────────────────────┤
│          │                                    │
│ - Início │     Conteúdo da página             │
│ - Comu   │     (RSC server-rendered)          │
│ - Cursos │                                    │
│ - Recu   │                                    │
│ - Apps   │                                    │
│ - Calend │                                    │
│ - Rank   │                                    │
│ - Notif  │                                    │
│ - Perfil │                                    │
│ - Admin  │                                    │
│          ├────────────────────────────────────┤
│ Sair     │ MobileNav (bottom bar, só mobile)  │
└──────────┴────────────────────────────────────┘
```

### 2.3 Categorias (constantes)

Definidas em [src/lib/constants.ts](../src/lib/constants.ts):

| Domínio | Valores |
|---|---|
| **Post** | geral · duvidas · apresentacoes · resultados · projetos · avisos · suporte |
| **Recurso** | apostilas · templates · planilhas · codigos · checklists · ferramentas |
| **App** | ia · programacao · automacao · produtividade · marketing · comunidade · ferramentas-internas |
| **Tipo de app** | link · embed · file · internal |
| **Status app** | active · coming-soon · beta |
| **Tipo evento** | live · mentoria · aula · desafio · reuniao |
| **Papel** | admin · moderator · member |

### 2.4 Gamificação

| Ação | Pontos | Disparo |
|---|---|---|
| `post_created` | +10 | Server Action `createPostAction` |
| `comment_created` | +5 | Server Action `createCommentAction` |
| `like_received` | +2 | **Trigger SQL** `handle_like_award` |
| `lesson_completed` | +15 | Server Action `markLessonCompleteAction` |
| `event_attended` | +20 | Server Action `rsvpEventAction` (status=going) |

**Idempotência**: garantida pela `UNIQUE(user_id, action, reference_type, reference_id)` em `points_ledger` + `ON CONFLICT DO NOTHING` na função SQL `award_points`. Curtir e descurtir o mesmo post **não** dobra pontos.

**Níveis**: 1 (0 pts) · 2 (100) · 3 (300) · 4 (700) · 5 (1500). Recalculados a cada `award_points`.

---

## 3. Stack e decisões técnicas

### 3.1 Tecnologias

| Camada | Escolha | Versão | Por quê |
|---|---|---|---|
| Framework | Next.js | 16.2.6 | App Router + RSC + Server Actions + Turbopack default |
| Linguagem | TypeScript | 5.x estrito | Type safety em toda stack |
| Estilo | Tailwind CSS | v4 | Tokens via `@theme inline`, sem `tailwind.config.js` |
| UI Kit | shadcn/ui | new-york + zinc | Componentes próprios em `src/components/ui/` |
| Auth + DB + Storage | Supabase | 2.x | Postgres + RLS + Storage + Auth num só backend |
| Forms | React Hook Form + Zod | 7.77 + 4.4 | Validação client + server unificada |
| Markdown | react-markdown + rehype-sanitize + remark-gfm | — | Posts ricos e seguros |
| Ícones | Lucide React | 1.17 | Consistência visual |
| Toaster | Sonner | 2.0 | Notificações leves |
| Package manager | pnpm | 10.12 | Consistente com NEXUS |
| Runtime | Node.js | 20.9+ | Requisito Next 16 |

### 3.2 Decisões arquiteturais importantes

**Monólito moderno, não microservices.** Tudo num único Next.js app. Server Actions chamam Supabase direto. Quando reconsiderar: se rotas específicas precisarem de scaling independente.

**RSC por padrão.** `"use client"` só quando precisa de `useState`, `useEffect`, listeners DOM. Reduz JS no bundle.

**Server Actions sobre Route Handlers.** Mutations usam `"use server"`. Route Handlers ficam reservados pra integração externa (`/api/health` pro HUB, `/auth/callback` pro Supabase).

**Defesa em profundidade — 3 camadas de validação:**
1. **Client** (Zod via RHF) → UX
2. **Server Action** (`requireRole` + Zod safeParse) → enforcement
3. **RLS Postgres** → última linha de defesa

**Stub `db.ts` permissivo.** Usa `any` em `Insert/Update` por design. **Quando regenerar:** após qualquer alteração de schema, rodar `pnpm db:types`.

**Markdown sanitizado nos posts.** `rehype-sanitize` bloqueia scripts/iframes embutidos. Padrão Skool/Reddit/GitHub.

**Vídeo: HTML5 + Supabase Storage no MVP.** Path migração documentado: Mux · Cloudflare Stream · Bunny · HLS próprio. Campos já preparados (`video_url` + `video_storage_path`).

**Marca CODEX neutra.** Paleta zinc + Geist Sans. Produto pode ser reusado em outros contextos.

---

## 4. Hierarquia de arquivos — ordem de leitura

### 4.1 Mapa visual

```
COMUNIDADE/
│
├─ Configuração (LER PRIMEIRO)
│  ├─ package.json              dependências + scripts pnpm
│  ├─ next.config.ts            Turbopack root + remotePatterns Supabase
│  ├─ tsconfig.json             strict + alias @/*
│  ├─ components.json           shadcn config
│  ├─ .env.example              template de variáveis
│  └─ .env.local                secrets reais (gitignored)
│
├─ Camada de segurança (LER SEGUNDO)
│  └─ proxy.ts                  middleware Next 16 — auth + role gate
│
├─ Banco (LER TERCEIRO)
│  └─ supabase/
│     ├─ config.toml            ports do Supabase local
│     ├─ migrations/
│     │  ├─ 0001_profiles_and_community.sql     profiles + helpers SQL
│     │  ├─ 0002_posts_comments_likes.sql       feed
│     │  ├─ 0003_courses_modules_lessons.sql    classroom
│     │  ├─ 0004_resources_apps_events.sql      biblioteca + agenda
│     │  ├─ 0005_gamification_notifications.sql award_points + triggers
│     │  ├─ 0006_rls_policies.sql               TODAS as policies RLS
│     │  └─ 0007_storage_buckets.sql            buckets + storage policies
│     ├─ seed.sql                                dados demo
│     ├─ _setup_cloud.sql                        (gerado) concatenado pro Cloud SQL Editor
│     └─ _seed_cloud.sql                         (gerado) seed pro Cloud
│
├─ Core lib (LER QUARTO)
│  └─ src/lib/
│     ├─ constants.ts           categorias + pontos + níveis + allowlists
│     ├─ utils.ts               cn() + formatDate + formatRelative + slugify
│     ├─ supabase/{client,server,admin}.ts   3 clients por contexto
│     ├─ auth/current-user.ts   getCurrentProfile · requireRole · requireAdmin
│     ├─ permissions/policies.ts isAdmin · canPost · canEditPost (TS)
│     ├─ validations/schemas.ts TODOS os Zod schemas
│     ├─ storage/upload.ts      allowlist extensões + isSafeEmbedUrl
│     └─ points/award.ts        wrapper TS da RPC award_points
│
├─ Server (LER QUINTO)
│  └─ src/server/
│     ├─ actions/               TODAS as mutations
│     │  ├─ auth.ts             login · register · forgot · logout
│     │  ├─ posts.ts            criar/editar/excluir/curtir/comentar
│     │  ├─ courses.ts          CRUD cursos + módulos + aulas + progress
│     │  ├─ resources-apps-events.ts  CRUD + RSVP
│     │  ├─ profile.ts          editar perfil
│     │  └─ admin.ts            role/ban member + settings
│     └─ queries/               leituras complexas pra RSC
│        ├─ dashboard.ts        cursos + posts + eventos + progress
│        ├─ posts.ts            feed com counts + liked_by_me
│        └─ courses.ts          detalhe curso + módulos + lições
│
├─ UI (LER SEXTO)
│  └─ src/components/
│     ├─ ui/                    shadcn primitives
│     ├─ shared/                cross-cutting
│     ├─ layout/                nav-items · Sidebar · MobileNav · Header
│     ├─ community/             PostCard · PostComposer · CommentList
│     ├─ courses/               CourseCard · LessonPlayer
│     └─ calendar/              RsvpButton
│
├─ App Router (LER POR ÚLTIMO)
│  └─ src/app/
│     ├─ layout.tsx             root: fontes + Toaster
│     ├─ globals.css            tokens shadcn + markdown
│     ├─ page.tsx               landing pública
│     ├─ (auth)/                login · register · forgot
│     ├─ auth/callback/         OAuth/magic-link return
│     ├─ (app)/                 grupo autenticado (Sidebar)
│     ├─ admin/                 grupo admin
│     └─ api/health/route.ts    consumido pelo HUB
│
└─ Docs
   ├─ README.md                 setup + deploy
   └─ docs/PROJETO.md           ESTE arquivo
```

### 4.2 Ordem recomendada de leitura pra entender o sistema

1. [package.json](../package.json) — o que está instalado
2. [proxy.ts](../proxy.ts) — como rotas são protegidas
3. [supabase/migrations/0001_profiles_and_community.sql](../supabase/migrations/0001_profiles_and_community.sql) — schema de identidade + helpers SQL
4. [supabase/migrations/0006_rls_policies.sql](../supabase/migrations/0006_rls_policies.sql) — contratos de segurança no banco
5. [src/lib/supabase/server.ts](../src/lib/supabase/server.ts) — como o app fala com o banco
6. [src/lib/auth/current-user.ts](../src/lib/auth/current-user.ts) — contrato de auth no app
7. [src/lib/constants.ts](../src/lib/constants.ts) — vocabulário do domínio
8. [src/server/actions/posts.ts](../src/server/actions/posts.ts) — exemplo de Server Action
9. [src/server/queries/posts.ts](../src/server/queries/posts.ts) — exemplo de query RSC
10. [src/app/(app)/community/page.tsx](../src/app/(app)/community/page.tsx) — exemplo de página com Suspense
11. [src/app/admin/page.tsx](../src/app/admin/page.tsx) — exemplo de dashboard admin
12. [README.md](../README.md) — setup local

---

## 5. Arquitetura — diagramas

### 5.1 Visão de runtime

```
                   ┌─────────────────┐
                   │  Navegador      │
                   │  (Chrome/Edge)  │
                   └────────┬────────┘
                            │ HTTPS
                            ▼
              ┌──────────────────────────┐
              │  Next.js 16 — port 3004  │
              │  ┌────────────────────┐  │
              │  │ proxy.ts (auth)    │  │ ← intercepta tudo
              │  ├────────────────────┤  │
              │  │ RSC                │  │ ← server-rendering
              │  │  app/(app)/...     │  │
              │  ├────────────────────┤  │
              │  │ Server Actions     │  │ ← mutations
              │  │  server/actions/   │  │
              │  ├────────────────────┤  │
              │  │ Client Components  │  │ ← hidratação
              │  └────────────────────┘  │
              └──────────┬───────────────┘
                         │ @supabase/ssr
                         ▼
              ┌──────────────────────────┐
              │  Supabase Cloud          │
              │  yagjnowggkqvjrnysihi    │
              │  ┌────────────────────┐  │
              │  │ Auth (GoTrue)      │  │
              │  ├────────────────────┤  │
              │  │ Postgres + RLS     │  │
              │  ├────────────────────┤  │
              │  │ Storage (6 buckets)│  │
              │  ├────────────────────┤  │
              │  │ Realtime (futuro)  │  │
              │  └────────────────────┘  │
              └──────────────────────────┘

         ┌─────────────────────────────────┐
         │  NEXUS HUB (4000) opcional      │
         │  faz GET /api/health a cada T   │
         │  exibe status no painel         │
         └─────────────────────────────────┘
```

### 5.2 Fluxo de auth (login)

```
Usuário                Browser            Server Action        Supabase Auth
   │                      │                      │                    │
   │  preenche form       │                      │                    │
   ├─────────────────────►│                      │                    │
   │                      │  POST /login         │                    │
   │                      │  (Server Action)     │                    │
   │                      ├─────────────────────►│                    │
   │                      │                      │ Zod safeParse      │
   │                      │                      │ (se inválido →     │
   │                      │                      │  retorna error)    │
   │                      │                      │                    │
   │                      │                      │ signInWithPassword │
   │                      │                      ├───────────────────►│
   │                      │                      │                    │
   │                      │                      │ sessão (cookies)   │
   │                      │                      │◄───────────────────┤
   │                      │                      │                    │
   │                      │                      │ revalidatePath('/') │
   │                      │                      │ redirect /dashboard│
   │                      │ Set-Cookie sb-…      │                    │
   │                      │◄─────────────────────┤                    │
   │                      │                      │                    │
   │                      │ GET /dashboard       │                    │
   │                      │ → proxy.ts valida    │                    │
   │                      │   sessão → RSC       │                    │
   │  vê dashboard        │◄─────────────────────┤                    │
   │◄─────────────────────┤                      │                    │
```

### 5.3 Fluxo de criação de post (com gamificação)

```
PostComposer (Client)        createPostAction (Server)       Supabase
        │                              │                          │
        │ submit                       │                          │
        ├─────────────────────────────►│                          │
        │                              │ requireProfile()         │
        │                              │ ↓                        │
        │                              │ (profile do cookie)      │
        │                              │                          │
        │                              │ check is_banned          │
        │                              │ ↓                        │
        │                              │ Zod safeParse            │
        │                              │ ↓                        │
        │                              │ INSERT posts             │
        │                              ├─────────────────────────►│
        │                              │                          │ RLS verifica
        │                              │                          │ author_id = uid()
        │                              │                          │ + is_not_banned()
        │                              │ {id}                     │
        │                              │◄─────────────────────────┤
        │                              │                          │
        │                              │ awardPoints(             │
        │                              │   userId, 'post_created',│
        │                              │   10, 'post', id)        │
        │                              ├─────────────────────────►│ RPC award_points
        │                              │                          │ → INSERT points_ledger
        │                              │                          │   (UNIQUE constraint)
        │                              │                          │ → UPDATE profiles
        │                              │                          │   (+10 pontos)
        │                              │                          │ → recalc_level
        │                              │                          │
        │                              │ revalidatePath('/community')
        │                              │ revalidatePath('/dashboard')
        │ {ok, id}                     │                          │
        │◄─────────────────────────────┤                          │
        │                              │                          │
        │ toast.success                │                          │
```

### 5.4 Camadas de segurança (defesa em profundidade)

```
┌─────────────────────────────────────────────────────────┐
│  1. CLIENT — Zod via RHF                                │
│     Bloqueia inputs maliciosos antes de enviar          │
│     UX: feedback instantâneo                            │
└────────────────────────┬────────────────────────────────┘
                         │ (atacante pode pular esta camada)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  2. proxy.ts (middleware)                               │
│     Rotas privadas → exige sessão                       │
│     /admin → exige role=admin                           │
└────────────────────────┬────────────────────────────────┘
                         │
                         ▼
┌─────────────────────────────────────────────────────────┐
│  3. SERVER ACTION                                       │
│     requireProfile / requireAdmin / requireModerator    │
│     Zod safeParse (NÃO confia no Client)                │
│     Allowlist de extensões / domínios embed             │
└────────────────────────┬────────────────────────────────┘
                         │ (atacante via API direta também)
                         ▼
┌─────────────────────────────────────────────────────────┐
│  4. POSTGRES — RLS                                      │
│     Última linha. Toda tabela tem policies.             │
│     Funções helpers: is_admin(), is_moderator(),        │
│     is_not_banned()                                     │
└─────────────────────────────────────────────────────────┘
```

---

## 6. Modelo de dados

### 6.1 Diagrama ER (relacionamentos chave)

```
              ┌─────────────────────────┐
              │ auth.users (Supabase)   │
              │  id · email · password  │
              └────────────┬────────────┘
                           │ trigger on_auth_user_created
                           ▼
              ┌─────────────────────────┐
              │ profiles                │
              │  id (= auth.uid)        │
              │  full_name · username   │
              │  role · points · level  │
              │  is_banned              │
              └──┬──────┬────────┬──────┘
                 │      │        │
        ┌────────┘      │        └──────────────┐
        │               │                       │
        ▼               ▼                       ▼
┌──────────────┐  ┌──────────────┐  ┌──────────────────┐
│ posts        │  │ post_likes   │  │ lesson_progress  │
│  author_id   │  │  post_id     │  │  user_id         │
│  category    │  │  user_id     │  │  lesson_id       │
│  body (md)   │  │  UNIQUE      │  │  completed       │
└──────┬───────┘  └──────────────┘  │  UNIQUE          │
       │                            └──────────────────┘
       ▼
┌──────────────┐
│ post_comments│
│  parent_id ↻ │ ← self-ref (threading)
└──────────────┘

              ┌─────────────────────────┐
              │ communities             │
              │  id · slug · visibility │
              └────────────┬────────────┘
                           │
            ┌──────────────┴───────────┐
            ▼                          ▼
   ┌────────────────┐         ┌──────────────────┐
   │ courses        │         │ community_members│
   │  community_id  │         │  community_id    │
   │  status        │         │  user_id         │
   └────┬───────────┘         └──────────────────┘
        │
        ▼
   ┌────────────────┐
   │ course_modules │
   │  course_id     │
   │  order_index   │
   └────┬───────────┘
        │
        ▼
   ┌────────────────┐
   │ lessons        │
   │  module_id     │
   │  course_id     │ ← denormalizado pra queries rápidas
   │  video_url     │
   │  content (md)  │
   └────────────────┘

   ┌──────────────────┐
   │ events           │
   │  starts_at       │
   │  external_url    │
   └────┬─────────────┘
        │
        ▼
   ┌──────────────────┐
   │ event_attendees  │
   │  event_id        │
   │  user_id         │
   │  status          │
   │  UNIQUE          │
   └──────────────────┘

   ┌──────────────────┐
   │ points_ledger    │ ← UNIQUE(user_id, action,
   │  user_id         │            reference_type,
   │  action          │            reference_id)
   │  points          │      ← idempotência absoluta
   │  reference_*     │
   └──────────────────┘

   ┌──────────────────┐  ┌──────────────────┐  ┌──────────────────┐
   │ resources        │  │ apps             │  │ notifications    │
   │  category        │  │  category · type │  │  user_id         │
   │  file_url        │  │  url · embed_url │  │  read_at         │
   └──────────────────┘  └──────────────────┘  └──────────────────┘

   ┌──────────────────┐
   │ settings         │ ← key/value JSONB (config app)
   └──────────────────┘
```

### 6.2 Funções SQL helpers (definidas em 0001/0005)

| Função | Para que serve | Onde é usada |
|---|---|---|
| `handle_new_user()` | Cria `profiles` automaticamente após signup | Trigger em `auth.users` |
| `touch_updated_at()` | Atualiza `updated_at` em UPDATE | Triggers genéricos |
| `current_role()` | Retorna role do usuário atual | Helper |
| `is_admin()` | `true` se admin & não banido | Policies RLS |
| `is_moderator()` | `true` se admin/mod & não banido | Policies RLS |
| `is_not_banned()` | `true` se não banido | Policies RLS |
| `recalc_level(points)` | Calcula nível a partir de pontos | `award_points` |
| `award_points(...)` | Insere ponto idempotente + atualiza profile + recalc | Server Actions |
| `handle_like_award()` | Premia +2 ao autor do post curtido | Trigger em `post_likes` |

### 6.3 Storage buckets

| Bucket | Público | Quem sobe | Tamanho max |
|---|---|---|---|
| `avatars` | sim | dono | 5 MB |
| `post-media` | sim | autenticado · não-banido | 50 MB |
| `videos` | privado | moderador/admin | 500 MB |
| `resources` | privado | moderador/admin | 100 MB |
| `apps` | privado | admin | 50 MB |
| `course-covers` | sim | moderador/admin | 10 MB |

Allowlist de extensões em [src/lib/storage/upload.ts](../src/lib/storage/upload.ts).
Bloqueadas: `exe`, `bat`, `cmd`, `sh`, `dmg`, `msi`, `scr`, `vbs`.

---

## 7. Fluxos críticos

### 7.1 Cadastro de novo membro

```
/register  →  registerAction
              ├ Zod (nome, email, senha ≥8)
              ├ supabase.auth.signUp({email, password, full_name})
              ├ trigger SQL handle_new_user → cria profiles
              └ redirect /dashboard
```

**Atenção em produção:**
- Confirmação por email **vem ligada por padrão** no Supabase Cloud. Cadastros novos vão precisar clicar no link do email. Para desligar: Authentication → Providers → Email → desmarcar "Confirm email".
- O seed bypassa isso inserindo `email_confirmed_at = now()` direto em `auth.users`.

### 7.2 Publicação no feed

```
PostComposer (Client)  →  createPostAction
                          ├ requireProfile()
                          ├ check is_banned
                          ├ Zod
                          ├ INSERT posts (RLS valida author = uid)
                          ├ awardPoints('post_created', +10)
                          │   ├ INSERT points_ledger (ON CONFLICT DO NOTHING)
                          │   ├ UPDATE profiles.points + recalc_level
                          ├ revalidatePath('/community')
                          ├ revalidatePath('/dashboard')
                          └ return {ok, id}
```

### 7.3 Like otimista

```
PostCard onLike (Client):
  1. setLiked(true) + setLikesCount(c+1)  ← UI atualiza instantâneo
  2. startTransition(async () => {
       togglePostLikeAction(postId)
       └ se erro: rollback estado local + toast.error
     })
```

A action no servidor:
```
togglePostLikeAction:
  ├ requireProfile + check is_banned
  ├ SELECT post_likes onde post_id=X AND user_id=me
  ├ se existe: DELETE
  ├ se não existe: INSERT
  │   └ trigger handle_like_award:
  │       awardPoints(author, 'like_received', +2, 'post', post_id)
  └ revalidatePath('/community')
```

### 7.4 Conclusão de aula

```
LessonPlayer "Marcar concluída":
  → markLessonCompleteAction(lessonId, courseId)
    ├ requireProfile + check is_banned
    ├ UPSERT lesson_progress (conflict: lesson_id+user_id)
    │   completed=true, completed_at=now()
    ├ awardPoints('lesson_completed', +15, 'lesson', lessonId)
    │   └ idempotência: re-marcar não dá pontos de novo
    └ revalidatePath('/courses/:id')
```

### 7.5 RSVP em evento

```
RsvpButton toggle:
  → rsvpEventAction(eventId, 'going' | 'declined')
    ├ requireProfile + check is_banned
    ├ UPSERT event_attendees (conflict: event_id+user_id)
    ├ if status='going': awardPoints('event_attended', +20)
    │   └ idempotente: alternar going → declined → going não duplica
    └ revalidatePath('/calendar')
```

### 7.6 Ban de membro (admin)

```
MemberRow toggle "Banir":
  → setMemberBannedAction(userId, true)
    ├ requireAdmin
    ├ UPDATE profiles SET is_banned=true WHERE id=userId
    └ revalidatePath('/admin/members')

Efeito no membro banido:
  - is_not_banned() retorna false
  - RLS bloqueia INSERT em posts, comments, likes, lesson_progress, event_attendees
  - Pode ler conteúdo, mas não interagir
  - Tela continua funcionando, mas actions retornam erro
```

---

## 8. Auditoria técnica

Resultado das varreduras automatizadas (backend + frontend) executadas em 2026-05-31.

### 8.1 Pontos críticos (corrigir cedo)

| # | Local | Achado | Recomendação |
|---|---|---|---|
| C1 | [src/components/community/post-card.tsx:112](../src/components/community/post-card.tsx) | `<img alt="">` em mídia de post — viola WCAG | `alt={post.title \|\| "Mídia da publicação"}` |
| C2 | post-card.tsx:53, delete-post-inline.tsx:19, resource-actions.tsx:116, event-actions.tsx:119, app-actions.tsx:174 | Uso de `confirm()` nativo em 5 lugares | Migrar para [ConfirmDialog](../src/components/shared/confirm-dialog.tsx) já existente |

### 8.2 Pontos médios (ajustar quando puder)

| # | Local | Achado | Decisão sugerida |
|---|---|---|---|
| M1 | Server Actions | 3 tipos de retorno diferentes (`ActionState`, `ActionResult`, `Result`) | Unificar em `lib/types/actions.ts` na próxima refatoração |
| M2 | Delete inline buttons (admin/posts, resources, events, apps) | Componentes ~23 linhas quase idênticos copy-paste em 4 lugares | Extrair `<DeleteActionButton action={fn}>` genérico |
| M3 | Composers (Post, Resource, Event, App) | Padrão de form repetido sem reuso | Avaliar hook `useFormComposer<T>()` ou seguir tal qual (DRY vs. clareza) |
| M4 | [src/server/actions/posts.ts](../src/server/actions/posts.ts) `deletePost` + `deleteComment` | `revalidatePath` só atinge `/community/*` | Adicionar `revalidatePath('/dashboard')` se há cache lá |
| M5 | Botões só com ícone (LessonPlayer, MobileNav, ícones do Sidebar) | Faltam `aria-label` em alguns | Adicionar para acessibilidade |
| M6 | Rotas dinâmicas (`[postId]`, `[courseId]`, `[lessonId]`, `[userId]`) | Sem `generateMetadata()` para títulos dinâmicos | Implementar quando SEO/title for prioridade |

### 8.3 Pontos menores (cosmético/cleanup)

| # | Local | Achado |
|---|---|---|
| L1 | [src/app/admin/page.tsx](../src/app/admin/page.tsx) | `AdminStatsCard` é inline — extrair se reusar |
| L2 | `FileUploader` / `VideoUploader` do briefing | Não foram criados como componentes dedicados (upload usa URL string) — adicionar quando for fazer upload nativo |
| L3 | `mobile-nav.tsx` | Sem `aria-label="Navigation"` na tag `<nav>` |
| L4 | `/courses`, `/resources`, `/apps`, `/calendar` | Sem Suspense (data pequena, OK por enquanto) |
| L5 | `lesson_comments` na tabela mas sem ação de gamificação | Briefing não pediu pontos — manter como está |

### 8.4 Validações que passaram

- ✓ Schema SQL bate 100% com `db.ts` (19 tabelas)
- ✓ Categorias Zod vs CHECK constraints SQL alinhadas (posts, recursos, apps, eventos)
- ✓ Indexes presentes nas colunas usadas em WHERE/ORDER
- ✓ RLS habilitado em **todas** as tabelas
- ✓ `award_points` 100% idempotente via `UNIQUE + ON CONFLICT DO NOTHING`
- ✓ Trigger `handle_like_award` cobre +2 ao autor do post curtido
- ✓ Todas as rotas pedidas no briefing existem (30 rotas)
- ✓ RSC/Client components bem separados
- ✓ HTML `lang="pt-BR"` e Toaster configurado
- ✓ Mobile responsiveness: Sidebar `md:flex`, MobileNav `md:hidden`
- ✓ Markdown sanitizado com `rehype-sanitize`
- ✓ Iframe restrito a allowlist de domínios em `lib/storage/upload.ts`
- ✓ 6 buckets de Storage criados com policies
- ✓ Defesa em profundidade Client + Action + RLS

### 8.5 Não-bugs (parece, mas não é)

- **"Server Actions e RLS validam dupla vez o role"** — intencional, defesa em profundidade.
- **"RSVP pode duplicar pontos"** — `UNIQUE` em `points_ledger` previne. Alternar going→declined→going não duplica.
- **"Stub `db.ts` não tem Insert/Update tipados"** — intencional, regenerar com `pnpm db:types` quando precisar.
- **"`policies.ts` duplica `is_admin()` SQL"** — TS é otimização (evita ida ao DB), SQL é enforcement final.

---

## 9. Lembretes, ajustes e roadmap

### 9.1 Coisas que NÃO esqueça (operacionais)

| Lembrete | Por quê |
|---|---|
| **`.env.local` NÃO vai pra Git** | Tem service_role key. `.gitignore` já cobre. |
| **`SUPABASE_SERVICE_ROLE_KEY` é só server-side** | Arquivo `lib/supabase/admin.ts` tem `import "server-only"` |
| **NEXT_PUBLIC_SUPABASE_URL precisa de `https://`** | Sem isso o cliente quebra com "Invalid URL". Sem `/rest/v1/` no fim. |
| **Senha demo do seed**: `codex123!` | Trocar antes de qualquer deploy público |
| **Supabase Free pausa após 7 dias sem acesso** | Acessar o dashboard pelo menos 1x/semana mantém ativo |
| **Confirmação de email vem ligada por padrão no Cloud** | Cadastros via `/register` exigem confirmação. Desligue em Auth → Providers se for MVP fechado. |
| **Cloud usa porta 5432 pra DB direto** | Pra `pnpm db:push` precisa dessa porta liberada na rede |
| **CLI Supabase espera Docker pra `db reset` local** | Cloud não precisa de Docker |

### 9.2 Decisões a tomar antes de produção

- [ ] **Multi-tenant ou single-community?** O schema já tem `communities` e `community_members`, mas o app assume 1 comunidade via `COMMUNITY_ID` em `lib/constants.ts`. Para multi: passar `community_id` em todas as queries e adicionar slug nas rotas (`/c/[slug]/community`).
- [ ] **Onboarding de email confirmation** ou link mágico ao invés de senha
- [ ] **Política de banimento progressivo** (warn → mute → ban) ou direto?
- [ ] **Quem vira moderador?** Adicionar UI pra promover em vez de só admin via SQL
- [ ] **Política de retenção de posts/comentários excluídos** — hoje é soft-delete (`is_deleted=true`)
- [ ] **Limite de upload** — 50 MB / post-media é razoável? Vai depender do plano Supabase
- [ ] **CSP (Content Security Policy)** — adicionar header de segurança
- [ ] **Rate limiting** — Supabase tem por API key, mas pra abuse direto no Next preciso adicionar

### 9.3 Próximas tarefas concretas (curto prazo)

Em ordem de prioridade:

1. **Corrigir C1, C2 da auditoria** — alt text + ConfirmDialog (1-2h)
2. **Regenerar tipos exatos do schema** — `pnpm db:types` apontando pro cloud (10 min)
3. **Implementar upload nativo** — substituir input "cole a URL" por `<FileUploader>` que sobe pro bucket correto (4-6h)
4. **Desligar confirm email no Supabase** ou implementar tela de "confirme seu email" (1h)
5. **Adicionar `generateMetadata()` em rotas dinâmicas** — título dinâmico pra post/curso/aula (1h)
6. **Sistema de notificações realtime** — usar Supabase Realtime para popular `notifications` quando alguém comenta no seu post / curte (4h)
7. **Trocar senha demo + criar usuário admin real** — SQL no cloud (15 min)
8. **CSP headers** em `next.config.ts` (30 min)

### 9.4 Roadmap médio prazo (próxima onda)

- **Multi-comunidade** — schema preparado, mudar `COMMUNITY_ID` constante para slug nas rotas
- **Upload nativo de vídeo** com player com tracking (saiu da aula em qual segundo)
- **Quizzes ao final de aulas** — nova tabela `lesson_quizzes`
- **Certificados PDF** quando curso 100% concluído — gerar server-side
- **Pagamentos Stripe + Mercado Pago** — gating de cursos premium
- **Assinaturas mensais** — tabela `subscriptions` + webhook Stripe
- **Push notifications** via FCM (web) e APNs (mobile futuro)
- **Chat 1:1 em tempo real** — usando Supabase Realtime
- **App mobile React Native/Expo** reusando Supabase backend
- **Lives nativas (não embed)** — via Mux Live ou similar
- **IA: resumo automático de aulas** — após upload de vídeo, transcrever (Whisper) + resumir (Claude/GPT)
- **IA: busca semântica** — pgvector + embeddings nos posts e aulas
- **Trilhas de aprendizagem** — sequenciamento entre cursos
- **Sistema de afiliados** — comissões por venda
- **White-label** — admin escolhe branding por comunidade

### 9.5 Pontos de expansão sem refatoração grande

| Você quer adicionar... | Onde mexer | Dificuldade |
|---|---|---|
| Nova categoria de post | `constants.ts` + CHECK constraint na migration | baixa |
| Novo tipo de evento | `constants.ts` + CHECK em `events.event_type` | baixa |
| Novo bucket de Storage | nova migration tipo `0007` | média |
| Nova ação de gamificação | adicionar em `PointsAction` (db.ts) + CHECK em `points_ledger` + chamar `awardPoints()` no lugar certo | baixa |
| Novo papel (ex: "convidado") | CHECK constraint em `profiles.role` + funções SQL helpers + policies RLS + `permissions/policies.ts` | média |
| Nova aba no menu | `components/layout/nav-items.ts` + criar página | baixa |
| Novo CRUD no admin | seguir padrão de `admin/resources` ou `admin/apps` | média |
| Integração com terceiros (Mux, Stripe…) | webhook em `app/api/<service>/route.ts` + service-role client | média |

### 9.6 Sinais de alerta (monitorar)

- **Tempo de resposta de queries acima de 500ms** → adicionar index, ou cache RSC, ou materializar view
- **`points_ledger` com milhões de linhas** → particionar por `created_at`
- **Plano Free Supabase chegando perto de 500MB** → migrar para Pro ($25/mês) ou limpar dados antigos
- **Custos de Storage > 1GB** → habilitar lifecycle policies (excluir avatars órfãos)
- **Bundle JS > 500kb gzipped** → revisar imports não-tree-shakeable (lucide-react importa por nome → OK)
- **Hidratação lenta** → diminuir Client Components, mais RSC

---

## 10. Comandos e troubleshooting

### 10.1 Comandos do dia-a-dia

```bash
# Desenvolvimento
pnpm dev              # http://localhost:3004 (Turbopack)
pnpm build            # build de produção
pnpm start            # serve build em 3004
pnpm lint             # ESLint
pnpm exec tsc --noEmit   # typecheck

# Banco (Supabase local — requer Docker)
pnpm db:start         # supabase start
pnpm db:stop
pnpm db:reset         # aplica migrations + seed
pnpm db:types         # gera src/types/db.ts do schema

# Cloud (Supabase remoto)
npx supabase login                                # 1x — abre browser, gera token
npx supabase link --project-ref yagjnowggkqvjrnysihi
npx supabase db push                              # aplica migrations no cloud
npx supabase gen types typescript --project-id yagjnowggkqvjrnysihi > src/types/db.ts
```

### 10.2 Erros comuns e soluções

| Erro | Causa | Solução |
|---|---|---|
| `fetch failed` no login | `.env.local` errado ou Supabase fora do ar | Rodar `node --env-file=.env.local scripts/test-connection.mjs` |
| `Invalid supabaseUrl: Must be a valid HTTP or HTTPS URL` | Falta `https://` no `NEXT_PUBLIC_SUPABASE_URL` | Garantir formato `https://xxx.supabase.co` (sem path) |
| `Your project's URL and Key are required` | `.env.local` não foi carregado | Reiniciar `pnpm dev` (env só carrega no startup) |
| `Email not confirmed` no login | Cloud exige confirmação de email | Auth → Providers → Email → desmarcar "Confirm email" |
| Login funciona mas `/dashboard` redireciona pra `/login` | Cookies do navegador travados | Hard refresh `Ctrl+Shift+R` ou limpar cookies do localhost:3004 |
| `Database connection failed` no `db push` | Senha do banco errada ou DB pausado | Verificar status do projeto no dashboard Supabase |
| Build OK mas página em branco | Hidratação quebrada | Abrir DevTools → Console; provavelmente import quebrado |
| `pnpm dev` mostra "Ready" mas porta 3004 fecha | Outro processo já segura a porta | `netstat -ano \| findstr ":3004"` → `taskkill /F /PID <pid>` |
| Mudei a migration mas o cloud não atualiza | Cloud não aplica direto, precisa `db push` ou colar no SQL Editor | Usar SQL Editor do dashboard pra mudanças incrementais |

### 10.3 Smoke test rápido

Quando alterar `.env.local` ou migrations, rode:

```bash
node --env-file=.env.local scripts/test-connection.mjs
```

Saída esperada:
```
URL:            https://....supabase.co
ANON length:    ≈208
SERVICE length: ≈219

=== 1. Auth (anon → /auth/v1/health) ===
HTTP 200 ✓

=== 2. Login real (admin@codex.community / codex123!) ===
✓ login OK | user: admin@codex.community | id: 11111111-...

=== 3. Query (rest /rest/v1/profiles) ===
HTTP 200
[]    ← vazio é esperado (RLS bloqueia anon)
```

### 10.4 Onde olhar quando algo está estranho

| Sintoma | Onde investigar primeiro |
|---|---|
| Não consigo logar | `.env.local` + Auth do Supabase + cookies do navegador |
| Logei mas vejo erro de permissão | `lib/permissions/policies.ts` + RLS no SQL Editor |
| Ação não persiste | Server Action retorna `{ok:false, error}` → ler `error` |
| Pontos não somam | Ver `points_ledger` no SQL Editor + função `award_points` |
| Cards aparecem zerados | Query em `server/queries/` + filtros (status, is_deleted) |
| Layout quebrado em mobile | Tailwind breakpoints (`md:`, `lg:`) em `layout/` |
| Imagem do bucket não carrega | `next.config.ts` → `images.remotePatterns` |
| Trigger não dispara | Logs no Postgres → Supabase Dashboard → Logs → Database |

### 10.5 Credenciais demo (seed)

Todos com senha `codex123!`:

| Email | Papel |
|---|---|
| `admin@codex.community` | admin |
| `mod@codex.community` | moderator |
| `ana@codex.community` | member |
| `bruno@codex.community` | member |
| `clara@codex.community` | member |

⚠ **Trocar antes de qualquer ambiente de teste/produção:**
```sql
-- via SQL Editor do Supabase
update auth.users set encrypted_password = crypt('NOVA_SENHA', gen_salt('bf'))
 where email = 'admin@codex.community';
```

### 10.6 Reset completo (cuidado)

Apaga TUDO no banco e re-aplica setup + seed:

```sql
-- via SQL Editor do Supabase Cloud (DESTRUTIVO)
drop schema if exists public cascade;
create schema public;
grant all on schema public to postgres, authenticated, anon, service_role;
-- ... depois colar _setup_cloud.sql e _seed_cloud.sql novamente
```

Local (Docker): `pnpm db:reset` já faz isso.

---

## Apêndice — Glossário rápido

| Termo | Significado |
|---|---|
| **RSC** | React Server Component — renderiza no servidor, zero JS no cliente |
| **RLS** | Row Level Security — políticas de acesso por linha no Postgres |
| **Server Action** | Função `"use server"` chamada do cliente como mutation |
| **Idempotência** | Executar 2x produz o mesmo resultado que executar 1x |
| **Soft delete** | Marcar `is_deleted=true` em vez de DELETE físico |
| **`points_ledger`** | Tabela auditável de TODOS os ganhos de pontos |
| **`is_not_banned()`** | Função SQL chamada em INSERTs pra impedir banidos de agir |
| **Stub `db.ts`** | Schema TS aproximado — regenerar com `pnpm db:types` quando preciso |
| **HUB** | NEXUS HUB na porta 4000 — orquestra todos os módulos do ecossistema |

---

**Fim do documento.** Para sugestões ou correções, editar este arquivo direto.

