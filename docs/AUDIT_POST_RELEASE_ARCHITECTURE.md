# AUDITORIA PÓS-RELEASE — ARQUITETURA

**Data:** 2026-07-08 · HEAD `fea4992` · Confiança dos itens: VERIFICADO salvo indicação.

## 1. Avaliação geral

**Saúde arquitetural: 8/10.** Projeto modular, com fontes de verdade centralizadas e defesa em profundidade deliberada (guards de layout → policies de aplicação → RLS). As features recentes (Chat, DM, Header Social, Biblioteca 2.0, Onboarding, Trending, Rewards) foram integradas sem quebrar a estrutura.

### Respostas às 10 perguntas da auditoria

1. **Modular?** Sim (7–8/10). Separação clara `(auth)` → `(app)` → `admin`; `src/server` (actions/queries) e `src/lib` (auth, permissions, validations, points, community, security, storage) bem particionados.
2. **Features recentes criaram acoplamento?** Moderado e controlado: o layout `(app)` agrega 3 contagens (DMs, notificações, conexões) por navegação — custo de performance, não de design (ver PERF-07 na auditoria técnica).
3. **Módulos grandes demais?** `post-card.tsx` (438 linhas: edição + reações + moderação) é o único arquivo inchado relevante. `community-feed.tsx` (213) aceitável.
4. **Arquivos com responsabilidades demais?** Apenas o `post-card.tsx` acima. Candidato a extração de `EditPostDialog`/menu de moderação — **não bloqueante**.
5. **Fontes de verdade claras?** Sim: `lib/validations/schemas.ts` (schemas), `lib/permissions/policies.ts` (permissões), `lib/community/structure.ts` (canais/legado), `lib/points/award.ts` (pontos), `lib/auth/current-user.ts` (guards). Única transição em aberto: categorias legadas → canais (mapeada e documentada em `structure.ts`).
6. **Admin reutiliza fluxos contextuais?** Sim na lógica (mesmas server actions com check `isModerator` interno); duplica apenas apresentação (tabela vs card) — redundância aceitável.
7. **Lógica de negócio em componentes visuais?** Contida: regras vivem em server actions; exceção parcial no `post-card.tsx`.
8. **Abstrações prematuras?** Não detectadas — `avatar-uploader`/`cover-uploader` compartilham `useImageUpload` e mantêm UX distinta; forms de recurso/app duplicam pouco e têm só 2 consumidores (não unificar).
9. **Preparada para novas features?** Sim — infra de notificações, ledger de pontos, saved_posts e `chat_messages.room` são pontos de extensão prontos (ver FEATURE_OPPORTUNITIES).
10. **Áreas a PROTEGER contra refatoração desnecessária:** `lib/community/structure.ts` (mapa de canais/legado), `lib/permissions/policies.ts` (afeta 3 camadas), `lib/points/award.ts` (idempotência crítica), guards de layout (`requireActiveProfile`/`requireAdmin`), `schemas.ts`, e a lógica de reentrância do `post-card.tsx`.

### Sobreposições julgadas

| Caso | Veredito |
|---|---|
| Guards em proxy.ts + layouts + server actions + RLS | **Defesa em profundidade válida** |
| Admin `/admin/posts` vs moderação contextual no post-card | **Redundância aceitável** (mesmas actions, UX distinta) |
| Notificações vs DM vs Chat | **Bem separados** (3 sistemas independentes) |
| Canais novos vs categorias legadas | **Transitório por design** (remap Fase 5 pendente) |
| award_points / admin_adjust_points / revert triggers | **Sem conflito** — operações distintas sobre o mesmo ledger, idempotência por unique constraint |

### Legacy (nada a remover durante a auditoria)

| Item | Classificação |
|---|---|
| `DEPRECATED_CHANNELS` (4 canais sem rota raiz) | Manter — remap de conteúdo previsto e ainda não executado |
| `LEGACY_CATEGORIES` + `LEGACY_CATEGORY_TO_CHANNEL` | Manter até remap; retrocompat ativa |
| `PENDING_CHANNELS` (vazio hoje) | Manter estrutura |
| `community_migration_backup` (tabela) | Manter; definir retenção futuramente |
| Docs de fases antigas em `docs/` | Manter como histórico (ver seção Documentação da auditoria técnica) |
| Componentes órfãos | Nenhum detectado por grep |

---

## 2. Diagramas (refletem o código real)

### 2.1 Arquitetura geral

```mermaid
flowchart LR
  subgraph Client["Browser"]
    RSC[React 19 / RSC + 68 client components]
  end
  subgraph Vercel["Vercel (Next.js 16)"]
    PX[proxy.ts - guard global]
    APP["App Router (app)/(auth)/admin/(content)"]
    SA[Server Actions src/server/actions]
    Q[Queries src/server/queries]
  end
  subgraph Supabase
    AUTH[Auth]
    PG[(Postgres + RLS)]
    ST[Storage 7 buckets]
    RT[Realtime]
  end
  SENTRY[Sentry]
  Client --> PX --> APP
  APP --> SA --> PG
  APP --> Q --> PG
  SA --> ST
  Client <--> RT
  APP --> AUTH
  APP -. instrumentation .-> SENTRY
```

### 2.2 Mapa de módulos

```mermaid
flowchart TD
  LIB[src/lib] --> AUTHL[auth/current-user]
  LIB --> PERM[permissions/policies]
  LIB --> VAL[validations/schemas]
  LIB --> PTS[points/award]
  LIB --> COMM[community/structure]
  LIB --> SEC[security/rate-limit]
  LIB --> STG[storage/upload]
  SRV[src/server] --> ACT["actions (12): auth, posts, chat, dm, connections, courses, biblioteca, admin, onboarding, rewards…"]
  SRV --> QRY["queries (11): posts, chat, dm, courses, events, trending, library, dashboard…"]
  CMP[src/components] --> UI[ui shadcn/Radix]
  CMP --> DOM["domínio: community, chat, direct, connections, notifications, library, courses, calendar"]
  CMP --> LAY[layout: sidebar, header, header-panel, mobile-nav]
  ACT --> PERM
  ACT --> VAL
  ACT --> PTS
  QRY --> PERM
```

### 2.3 Hierarquia de rotas

```mermaid
flowchart TD
  ROOT["/ layout raiz"] --> AUTHG["(auth): /login /register /forgot-password"]
  ROOT --> CB["auth/callback"]
  ROOT --> APPG["(app) shell autenticado"]
  ROOT --> ADM["/admin (role admin)"]
  ROOT --> CONT["(content) preview público: /resources/[slug] /apps/[slug]"]
  ROOT --> LEG["(legal): /termos /privacidade"]
  ROOT --> BAN["/banned"]
  APPG --> FEED["/community + /c/[channel] + /[postId] + 13 canais na raiz"]
  APPG --> SOCIAL["/chat-e-networking /mensagens /notifications /salvos /conexoes"]
  APPG --> LEARN["/courses/[id]/lessons/[id] /resources /apps (@modal intercepting)"]
  APPG --> ENG["/calendar /leaderboard /rewards /onboarding /dashboard /profile /members/[id]"]
  ADM --> ADMSUB["members, posts, courses, resources, apps, events, rewards, reports, settings"]
```

### 2.4 Fluxo de autenticação

```mermaid
sequenceDiagram
  participant U as Usuário
  participant P as proxy.ts
  participant A as (auth) actions
  participant SB as Supabase Auth
  participant CB as auth/callback
  U->>P: request rota protegida
  P->>SB: getUser() via cookies SSR
  alt sem sessão
    P-->>U: redirect /login?redirectedFrom=…
  end
  U->>A: login/register (rate-limited, zod)
  A->>SB: signIn/signUp
  SB->>CB: callback + code
  CB->>CB: safeNextPath(next) valida redirect
  alt conta nova sem onboarding
    CB-->>U: /onboarding?next=…
  else
    CB-->>U: destino validado (default /dashboard)
  end
```

### 2.5 Fluxo de permissões (defesa em profundidade)

```mermaid
flowchart TD
  R[Request] --> L1["1. proxy.ts: sessão + /admin exige role admin e não-banido"]
  L1 --> L2["2. Layout guards: requireActiveProfile / requireAdmin"]
  L2 --> L3["3. Server action: requireProfile/requireAdmin + policies.ts (canEditPost, canModerate…)"]
  L3 --> L4["4. Postgres RLS: policies por tabela + is_admin()/is_moderator()/is_not_banned()"]
  L4 --> DB[(dados)]
```

### 2.6 Fluxo de publicação

```mermaid
sequenceDiagram
  participant M as Membro
  participant C as post-composer
  participant SA as createPostAction
  participant DB as Postgres (RLS)
  M->>C: título/corpo/canal (+imagem)
  C->>SA: FormData
  SA->>SA: rate-limit + zod + canPostInChannel(structure.ts)
  SA->>DB: INSERT posts (RLS: own + regras do canal)
  DB->>DB: triggers de notificação
  SA->>SA: awardPoints(POST_CREATED) idempotente
  SA->>SA: revalidatePath(feed/canal)
  SA-->>M: post no feed
```

### 2.7 Fluxo do Chat Network

```mermaid
sequenceDiagram
  participant U as Membro
  participant CR as chat-room.tsx (client)
  participant SA as chat actions
  participant DB as chat_messages
  participant RT as Supabase Realtime
  U->>CR: abre /chat-e-networking
  CR->>DB: histórico (limit)
  CR->>RT: subscribe canal room=community
  U->>SA: enviar (profanity + rate-limit + sessão)
  SA->>DB: INSERT (RLS: own, não banido)
  RT-->>CR: postgres_changes INSERT/UPDATE
  CR->>CR: setMessages + cleanup removeChannel no unmount
```

### 2.8 Fluxo de pontos

```mermaid
flowchart TD
  ACTPT["Ações: post, comentário, like recebido, aula concluída…"] --> AW["lib/points/award.ts (server-only, service_role)"]
  AW --> RPC["RPC award_points SECURITY DEFINER (0031: EXECUTE só service_role)"]
  RPC --> LED[("points_ledger UNIQUE(user,action,ref) = idempotência")]
  LED --> LVL[recalc_level]
  ADJ["admin_adjust_points (is_admin interno, motivo obrigatório)"] --> LED
  DEL["soft-delete post/comentário (trigger 0032) e hard-delete evento/aula (trigger 0035)"] --> REV[estorno automático] --> LED
  LED --> RANK["get_monthly_ranking / leaderboard (cache)"]
  RANK --> RW["rewards (UNIQUE month+rank, emissão manual admin)"]
```

### 2.9 Fluxo de eventos e RSVP

```mermaid
sequenceDiagram
  participant A as Admin
  participant M as Membro
  participant DB as events / event_attendees
  A->>DB: cria evento (write admin-only por RLS)
  M->>M: /calendar classifica futuro/andamento/encerrado
  M->>DB: RSVP upsert event_attendees (RLS own)
  M->>DB: cancelar presença (DELETE own)
  Note over DB: estorno de pontos em hard-delete de evento (0035)
```

### 2.10 Mapa simplificado do banco

```mermaid
erDiagram
  profiles ||--o{ posts : autor
  profiles ||--o{ post_comments : autor
  profiles ||--o{ points_ledger : possui
  profiles ||--o{ notifications : recebe
  profiles ||--o{ member_onboarding : preenche
  posts ||--o{ post_comments : tem
  posts ||--o{ post_likes : tem
  posts ||--o{ post_reactions : tem
  posts ||--o{ saved_posts : salvo_em
  courses ||--o{ course_modules : contem
  course_modules ||--o{ lessons : contem
  lessons ||--o{ lesson_progress : progresso
  lessons ||--o{ lesson_comments : comentarios
  events ||--o{ event_attendees : rsvp
  dm_conversations ||--o{ direct_messages : mensagens
  profiles ||--o{ dm_blocks : bloqueia
  profiles ||--o{ follows : segue
  profiles ||--o{ friendships : amizade
  profiles ||--o{ rewards : premiado
  profiles ||--o{ chat_messages : envia
```

---

*Nenhuma refatoração foi executada. Recomendações de mudança estão na auditoria técnica e no roadmap, sujeitas a aprovação explícita.*
