# CODEX Community — MVP

Plataforma própria de **comunidade + cursos + recursos + biblioteca de apps + eventos + gamificação**, inspirada em Skool, Circle e Mighty Networks. Construída como monólito moderno em Next.js.

> Módulo independente do ecossistema **NEXUS HUB** — registrado na porta **3004**.

### 📚 Documentação

| Doc | Quando ler |
|---|---|
| **[docs/PROJETO.md](docs/PROJETO.md)** | Para entender ou expandir o projeto — contexto, arquitetura, diagramas, modelo de dados, fluxos, auditoria, roadmap |
| **[docs/PLAYBOOK.md](docs/PLAYBOOK.md)** | Para operar no dia-a-dia — como subir conteúdo, como atuar em cada aba como admin |
| **[docs/PRODUCAO.md](docs/PRODUCAO.md)** | Para ir ao ar — checklist de bloqueadores antes de receber membros reais |

---

## 1. Stack

| Camada | Tecnologia |
|---|---|
| Framework | Next.js 16 (App Router + RSC + Server Actions + Turbopack) |
| Linguagem | TypeScript estrito |
| Estilo | Tailwind CSS v4 + shadcn/ui (style "new-york", base zinc) |
| Auth + DB + Storage + Realtime | Supabase |
| Forms | React Hook Form + Zod |
| Server state | TanStack Query (onde RSC não cobre) |
| Markdown | react-markdown + rehype-sanitize + remark-gfm |
| Ícones | Lucide React |
| Notificações UI | Sonner (toaster) |
| Deploy | Vercel-ready |
| Package manager | pnpm |

---

## 2. O que está pronto neste MVP

### Áreas do membro
- **Landing pública** com preview de cursos e publicações
- **Autenticação** (login, cadastro, recuperação de senha, callback OAuth)
- **Dashboard** com cursos em andamento, eventos, posts recentes e pontuação
- **Comunidade / Feed** com posts em Markdown, comentários, curtidas, busca e filtros por categoria
- **Cursos / Classroom** com módulos, aulas, vídeo player HTML5, progresso por usuário
- **Biblioteca de Recursos** (PDFs, templates, planilhas, código)
- **Biblioteca de Apps** com tipos `link`, `embed`, `file`, `internal` (allowlist de domínios para iframes)
- **Calendário** com RSVP e gamificação por participação
- **Leaderboard** (top 50) com nível e pontos
- **Perfil** próprio e perfis públicos de outros membros
- **Notificações**

### Painel admin (`/admin`)
- Visão geral com estatísticas
- CRUD de cursos, módulos e aulas (com vídeo)
- Moderação de posts
- CRUD de recursos
- CRUD de apps
- CRUD de eventos
- Gestão de membros (papel + banimento)
- Configurações da comunidade (nome, descrição, cor, visibilidade)

### Sistema de gamificação
Pontuação idempotente via função SQL `award_points(...)` + trigger SQL:

| Ação | Pontos |
|---|---|
| `post_created` | +10 |
| `comment_created` | +5 |
| `like_received` (autor) | +2 |
| `lesson_completed` | +15 |
| `event_attended` | +20 |

Níveis: 1 (0) · 2 (100) · 3 (300) · 4 (700) · 5 (1500).

### Segurança
- Middleware (`proxy.ts`) protege rotas privadas e `/admin/*`
- Server Actions verificam papel server-side em toda mutação
- Validação dupla com Zod (cliente + servidor)
- Markdown sanitizado com `rehype-sanitize`
- Iframes restritos a allowlist de hosts seguros
- RLS habilitado em **todas** as 18 tabelas
- Storage com policies por bucket

---

## 3. Estrutura

```
COMUNIDADE/
├── proxy.ts                          middleware Next 16 (auth + role gate)
├── next.config.ts
├── components.json                   shadcn config
├── supabase/
│   ├── config.toml                   ports 54321-54326
│   ├── migrations/                   7 SQLs (schema completo + RLS + storage)
│   └── seed.sql                      admin + moderador + 3 membros + cursos
├── src/
│   ├── app/
│   │   ├── page.tsx                  landing pública
│   │   ├── (auth)/                   login · register · forgot-password
│   │   ├── auth/callback/route.ts    OAuth callback
│   │   ├── (app)/                    grupo autenticado
│   │   │   ├── dashboard
│   │   │   ├── community (+ [postId])
│   │   │   ├── courses (+ [courseId] + lessons/[lessonId])
│   │   │   ├── resources · apps · calendar · leaderboard
│   │   │   ├── profile · members/[userId] · notifications
│   │   ├── admin/                    role admin
│   │   └── api/health/route.ts       healthcheck para o HUB
│   ├── components/
│   │   ├── ui/                       shadcn (button, card, dialog, …)
│   │   ├── layout/                   AppShell · Sidebar · MobileNav · Header
│   │   ├── community · courses · calendar · shared
│   ├── lib/
│   │   ├── supabase/{client,server,admin}.ts
│   │   ├── auth/current-user.ts      requireProfile / requireAdmin / requireModerator
│   │   ├── permissions/policies.ts
│   │   ├── validations/schemas.ts    Zod
│   │   ├── storage/upload.ts         allowlist de extensões e hosts embed
│   │   ├── points/award.ts           wrapper da RPC award_points
│   │   ├── constants.ts              categorias, níveis, pontos
│   │   └── utils.ts                  cn, formatDate, formatRelative, slugify
│   ├── server/
│   │   ├── actions/                  auth · posts · courses · profile · admin · resources-apps-events
│   │   └── queries/                  dashboard · posts · courses
│   └── types/db.ts                   stub do schema (regenerar com `pnpm db:types`)
```

---

## 4. Pré-requisitos

- **Node.js** 20.9+
- **pnpm** 10+
- **Docker Desktop** (para Supabase local)
- **Supabase CLI** (opcional global): `npm i -g supabase` — ou use via `pnpm db:start`

---

## 5. Setup local

```bash
# 1. instale dependências
cd COMUNIDADE
pnpm install

# 2. copie variáveis (.env.example traz as keys default da CLI Supabase)
cp .env.example .env.local

# 3. suba o Supabase local (Docker)
pnpm db:start
#  → API:    http://127.0.0.1:54321
#  → Studio: http://127.0.0.1:54323
#  → Inbox:  http://127.0.0.1:54324  (e-mails de teste)

# 4. aplique migrations + seed
pnpm db:reset

# 5. rode o app
pnpm dev
#  → http://localhost:3004
```

### Credenciais demo

Todas as contas do seed têm a senha **`codex123!`**:

| Email | Papel |
|---|---|
| `admin@codex.community` | admin |
| `mod@codex.community` | moderator |
| `ana@codex.community` | member |
| `bruno@codex.community` | member |
| `clara@codex.community` | member |

---

## 6. Variáveis de ambiente

```env
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:54321
NEXT_PUBLIC_SUPABASE_ANON_KEY=...   # da CLI Supabase
SUPABASE_SERVICE_ROLE_KEY=...       # NUNCA exposta no client
NEXT_PUBLIC_APP_URL=http://localhost:3004
```

> `SUPABASE_SERVICE_ROLE_KEY` só é usada em [src/lib/supabase/admin.ts](src/lib/supabase/admin.ts), que tem `import "server-only"` para garantir que não vaza para o bundle do navegador.

---

## 7. Buckets de Storage

Criados via migration `0007_storage_buckets.sql`:

| Bucket | Público | Upload |
|---|---|---|
| `avatars` | sim | dono |
| `post-media` | sim | autenticado · não-banido |
| `videos` | privado | moderador/admin |
| `resources` | privado | moderador/admin |
| `apps` | privado | admin |
| `course-covers` | sim | moderador/admin |

**Allowlist de extensões** em [src/lib/storage/upload.ts](src/lib/storage/upload.ts).
**Bloqueadas por padrão**: `exe`, `bat`, `cmd`, `sh`, `dmg`, `msi`, `scr`, `vbs`.

---

## 8. Integração com o NEXUS HUB

Este módulo é registrado em [`../HUB/server/projects.config.ts`](../HUB/server/projects.config.ts):

```ts
{
  id: 'comunidade',
  name: 'CODEX COMMUNITY',
  shortName: 'COMU',
  icon: '🌐',
  cwd: path.join(NEXUS_ROOT, 'COMUNIDADE'),
  command: 'pnpm',
  args: ['dev'],
  port: 3004,
  color: '#0a0a0a',
}
```

O HUB monitora `GET /api/health` que retorna:
```json
{ "status": "online", "module": "comunidade", "port": 3004, "ts": 1748... }
```

---

## 9. Deploy na Vercel

1. Crie um projeto Supabase em [supabase.com](https://supabase.com).
2. Aplique as migrations: `pnpm supabase db push` (após `pnpm supabase link --project-ref <ref>`).
3. Aplique o `supabase/seed.sql` opcionalmente.
4. Crie os buckets equivalentes (já criados pela migration `0007`).
5. Importe o repo na Vercel apontando `COMUNIDADE/` como raiz.
6. Configure as 4 variáveis de ambiente (`NEXT_PUBLIC_*` + `SUPABASE_SERVICE_ROLE_KEY` + `NEXT_PUBLIC_APP_URL`).
7. Atualize `additional_redirect_urls` no `auth` Supabase para incluir o domínio Vercel.

---

## 10. Como criar um admin manualmente

```sql
-- via SQL editor do Supabase Studio
update public.profiles
   set role = 'admin'
 where id = (select id from auth.users where email = 'voce@example.com');
```

---

## 11. Upload de vídeo (decisão de MVP)

No MVP, vídeos são servidos diretamente do bucket `videos` do Supabase Storage com URL assinada e player HTML5 nativo.

**Para produção com tráfego real**, considere:
- **Mux** — transcoding HLS adaptativo + analytics
- **Cloudflare Stream** — barato, com transcoding e DRM
- **Bunny Stream** — custo/benefício excelente para LATAM
- **Self-hosted HLS** com FFmpeg + CDN próprio

Os campos `lessons.video_url` e `lessons.video_storage_path` foram desenhados para acomodar essa migração futura sem mudar o front.

---

## 12. Limitações do MVP

- Multi-comunidade: schema preparado (`communities` + `community_members`), mas UI assume uma única comunidade (constante `COMMUNITY_ID` em `lib/constants.ts`).
- Upload direto via UI: o composer aceita URL — para upload nativo a UI precisa de mais um passo (ver "Roadmap").
- Notificações: apenas leitura — geração automática ainda não está plugada.
- Markdown sanitizado, mas sem editor WYSIWYG.
- Tema dark disponível via classe `.dark`, mas sem toggle automático ainda.
- Sem testes automatizados (MVP focou em código de produção).

---

## 13. Roadmap futuro

Áreas preparadas no schema/arquitetura mas **não implementadas** neste MVP:

- Pagamentos com Stripe e Mercado Pago
- Assinaturas mensais e gating de conteúdo
- Multi-comunidades / whitelabel
- App mobile React Native / Expo
- Push notifications
- Chat em tempo real (Realtime do Supabase)
- Lives internas
- Transcoding de vídeo (Mux / Cloudflare Stream / Bunny)
- IA: resumo automático de aulas
- IA: busca semântica (`pgvector`)
- Certificados e quizzes
- Trilhas de aprendizagem
- Sistema de afiliados
- Analytics avançado

---

## 14. Comandos úteis

```bash
pnpm dev               # dev server na porta 3004
pnpm build             # build de produção (Turbopack)
pnpm start             # serve build em 3004
pnpm lint              # ESLint
pnpm typecheck         # tsc --noEmit

pnpm db:start          # supabase start (Docker)
pnpm db:stop           # supabase stop
pnpm db:reset          # aplica migrations + seed
pnpm db:types          # regenera src/types/db.ts a partir do schema
```

---

## 15. Licença

MVP interno do ecossistema NEXUS — uso restrito.
