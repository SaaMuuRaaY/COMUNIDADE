# HARDENING PRÉ-FEATURES — Portal Nexus (módulo COMUNIDADE)

> Etapa curta de hardening técnico executada após a auditoria (`APROVADO COM CORREÇÕES P0/P1`).
> **Data:** 2026-06-30 · **Branch:** `master` · **HEAD (antes):** `df23feb` · **Escopo:** localhost, **sem** commit/push/deploy/cloud/migrations.
> **Princípio:** apenas riscos concretos de baixo esforço e alto valor. Sem refatoração ampla, sem abstrações novas, sem limpeza oportunista.

---

## 1. Baseline (evitar regressão)

| Check | Antes | Depois |
|---|:---:|:---:|
| `git status` | working tree limpo (só 2 docs de auditoria untracked) | 11 arquivos M + `vercel.txt` D (staged) |
| `pnpm typecheck` | ✅ exit 0 | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 | ✅ exit 0 |
| `pnpm build` | ✅ exit 0 (32 rotas) | ✅ exit 0 (32 rotas — idêntico) |

O warning `[env] NEXT_PUBLIC_APP_URL aponta para localhost` aparece **antes e depois** — é o guard de `lib/env.ts` reagindo ao `.env.local` local; **não** é regressão (é item P0 de configuração de cloud, fora desta fase).

**Invariantes revalidados por leitura (não regrediram):** proxy/auth, `requireActiveProfile` (gate de banido no layout `(app)`), `requireAdmin`, owner protegido, RLS — **nenhum tocado**. Fluxos de auth (`auth.ts`) **intocados**. As mudanças em like/rsvp/lesson preservam o caminho feliz idêntico.

---

## 2. Arquivos alterados

| Arquivo | Bloco | Mudança |
|---|:---:|---|
| `.github/workflows/deploy.yml` | A | Removido gatilho `push`; mantido `workflow_dispatch`; banner LEGADO/DESATIVADO |
| `vercel.txt` | B | `git rm --cached` (fora do índice; preservado em disco; já no `.gitignore`) |
| `supabase/_setup_cloud.sql` | C | Banner de topo: LEGADO/snapshot (só 0001–0007); `migrations/` = fonte única |
| `docs/PROJETO.md` | C | Marcada estrutura `_setup_cloud/_seed_cloud` como legado; §10.6 aponta para `migrations/`/`db push` |
| `src/components/community/post-card.tsx` | E | `onLike`: acopla `liked`+`likesCount` via `next` (corrige contador stale) |
| `src/components/calendar/rsvp-button.tsx` | E | `toggle`: captura `next` uma vez (corrige estado stale) |
| `src/server/queries/courses.ts` | E | `getLessonForViewer(lessonId, userId, courseId)`: valida `lesson.course_id === courseId` |
| `src/app/(app)/courses/[courseId]/lessons/[lessonId]/page.tsx` | E | Passa `courseId` ao `getLessonForViewer` |
| `src/lib/auth/current-user.ts` | E | `getCurrentProfile`: distingue perfil inexistente (`null`) de erro real de banco (`throw`+log) |
| `src/server/actions/posts.ts` | E | `togglePostLike`/`togglePostReaction`: mensagem amigável + `console.error` seguro (sem vazar msg crua) |
| `src/server/actions/resources-apps-events.ts` | E | `rsvpEventAction`: mensagem amigável + log seguro |
| `src/lib/security/rate-limit.ts` | Rate-limit | Comentário corrigido (Hetzner→Vercel/best-effort) — sem mudança de comportamento |

**Total:** 11 modificados + 1 removido do índice. **Nenhum** arquivo Docker/Caddy/Dockerfile/compose removido. **Nenhuma** migration criada/alterada. **Nenhuma** dependência instalada/removida.

---

## 3. Decisões

- **Bloco A — deploy.yml:** confirmado como stack Hetzner antiga (SSH → `/opt/codex-community` + `docker compose`). Desativado o **auto-deploy** (removido `push`), preservado `workflow_dispatch` (reativável) e o arquivo. Vercel permanece a **única fonte oficial de deploy**. Docker/compose/Caddyfile **não removidos** (decisão dedicada futura).
- **Bloco B — vercel.txt:** estava versionado. Removido do índice (`git rm --cached`), mantido em disco e no `.gitignore`. **Conteúdo inspecionado, não exposto** — ver §7 (rotação).
- **Bloco C — _setup_cloud.sql:** confirmado **defasado** (só 0001–0007; falta 0008–0012). Classificado como **LEGADO / snapshot histórico**; **não** sincronizado à mão. Definido oficialmente: **`supabase/migrations/` = única fonte de verdade do schema**; provisionamento via `npx supabase db push`. Referências operacionais em `PROJETO.md` corrigidas.
- **Bloco D — tipos Supabase:** **INTERROMPIDO** (ambiente não preparado). Ver §8.
- **Bloco E — bugs:** 5 correções pequenas e confirmadas aplicadas (§5).
- **Rate-limit:** auditado; decisão = **best-effort/defesa-em-profundidade** documentada (§9). Nenhum serviço externo instalado.

---

## 4. Itens corrigidos

1. **Contador otimista de like stale** (`post-card.tsx` `onLike`): `setLikesCount` usava o `liked` capturado enquanto `setLiked` era funcional → desincronizava no clique duplo. Agora ambos derivam de `const next = !liked` (acoplados); rollback idem.
2. **RSVP stale** (`rsvp-button.tsx` `toggle`): `setGoing(!going)`/toast usavam `going` capturado. Agora `const next = !going` é capturado uma vez e usado no arg da action, no `setGoing` e no toast.
3. **lessonId↔courseId** (`getLessonForViewer` + página): agora valida que a aula pertence ao curso da rota; divergência → `null` → `notFound()`. Evita `/courses/A/lessons/<aula-de-B>` com links incoerentes.
4. **`getCurrentProfile` distingue erros**: `error` do SELECT agora é tratado — perfil inexistente (`data === null`) segue retornando `null` (comportamento legítimo, tratado pelos callers); **erro real de banco** loga e lança (não é mais mascarado como "deslogado"→`/login`).
5. **Erros crus → amigáveis (fluxos tocados)**: `togglePostLike`, `togglePostReaction` e `rsvpEventAction` deixaram de devolver `error.message` cru; agora retornam mensagem amigável e logam o detalhe via `console.error` (sem vazar schema ao usuário).

---

## 5. Itens deliberadamente NÃO alterados

Conforme as decisões explícitas do escopo (evitar overcoding / preservar comportamento):

- **NÃO** adicionado `requireActiveProfile()` em todas as páginas — o layout `(app)` já é o boundary de banido (A-2 fica como P1 opcional, não aplicado aqui).
- **NÃO** removida nenhuma camada de defesa em profundidade (proxy/require*/RLS; SELECT extra de visibilidade de curso mantido).
- **NÃO** instalado Upstash/Redis nem qualquer serviço externo.
- **NÃO** criado wrapper de autorização, CrudKit, `useFormComposer`, nem `DeleteActionButton`.
- **NÃO** removidas dependências mortas (`react-hook-form`, `@tanstack/react-query`, `date-fns`, Radix órfãos) — fica para P2 oportunístico.
- **NÃO** removidos Docker/compose/Caddyfile nem assets/componentes órfãos.
- **NÃO** reestruturado o motor de tema (F-26 fica para confirmação de uso).
- **NÃO** alterada paginação, contagem de feed, reações, pontos ou triggers.
- **NÃO** tocado o `onReact` (já estava consistente — usa `had` capturado uniformemente).
- **NÃO** alterado nada na Supabase cloud, nenhuma migration criada.

---

## 6. Riscos

| Mudança | Risco | Avaliação |
|---|---|---|
| `getCurrentProfile` agora pode `throw` em erro de banco | Baixo | Só dispara em erro REAL de DB (raro). Antes, mascarava como logout→`/login`. Propaga ao error boundary — comportamento mais correto. Tipo de retorno inalterado (`Profile\|null`). |
| Validação lesson↔course | Baixo | Navegação legítima passa o `courseId` correto (mesma origem do Link). Só URLs manipuladas passam a dar 404 (desejado). |
| Mensagens de erro amigáveis | Muito baixo | Só troca o texto de `error` (tipo `string` inalterado). E2E não asserta msg crua do Postgres. |
| `deploy.yml` sem `push` | Baixo | Auto-deploy Hetzner cessa. Se o Hetzner ainda estivesse servindo, isso **para** de sincronizá-lo (desejado; Vercel é oficial). Reativável. |
| `git rm --cached vercel.txt` | Baixo | Só desstageia do índice; arquivo intacto em disco. Efetiva só ao commitar (não feito). |
| Banner em `_setup_cloud.sql` | Nenhum | Só comentário SQL; arquivo não é executado por nada automatizado. |

---

## 7. `vercel.txt` — indício de segredo / rotação

Conteúdo inspecionado **sem exposição**: são **6 linhas** no formato `8hex-8hex` (16 dígitos hex por linha, com um hífen no meio). Esse formato **não corresponde** a token padrão da Vercel (24+ alfanuméricos), nem a JWT/anon-key do Supabase, nem a chave `service_role`, nem a SSH key. Provável artefato órfão (ex.: fragmentos de IDs/hooks).

- **Probabilidade de credencial ativa: baixa** (formato não bate com segredos conhecidos).
- **Recomendação (precaução):** como a origem é desconhecida e os valores já estiveram no histórico do Git, se forem identificadores de algo real (deploy hooks, webhooks), **rotacionar na origem** e, se confirmado segredo, **expurgar do histórico** (`git filter-repo`). Caso contrário, apenas manter fora do índice (já feito) e deletar o arquivo do disco numa limpeza futura. **Nenhum valor foi impresso** neste relatório nem no terminal.

---

## 8. Tipos Supabase — Bloco D INTERROMPIDO

**Auditoria:** `src/types/db.ts` é stub manual — `Row`s tipadas, mas `GenericTable.Insert/Update: any` e `Views/Functions/Enums: any` (linhas 245–285). O `Database` é exportado mas **os clients não usam o generic**: `server.ts`/`client.ts` chamam `createServerClient/createBrowserClient` sem `<Database>`; `admin.ts` idem. Comando previsto: `pnpm db:types` (= `npx supabase gen types typescript --local > src/types/db.ts`).

**Viabilidade verificada:** Docker disponível (28.4.0), **mas** a CLI do Supabase **não está instalada** localmente (`npx --no-install supabase` cancela) e **não há stack local rodando nem link** (`supabase/.temp` ausente). Logo o ambiente **não está preparado** — gerar exigiria baixar a CLI + subir o stack + aplicar 12 migrations.

**Decisão (conforme regra do escopo):** **não gerar às cegas, não reescrever tipos à mão, e não integrar o generic do stub** — integrar `<Database>` do stub `any`-friendly daria falsa segurança (Insert/Update seguem `any`, relações não modeladas) e arriscaria uma cascata de erros de tipo nos joins = overcoding. Integração dos clients fica **acoplada** à geração real.

**Comando exato + pré-requisito para retomar (fora desta fase):**

```bash
# OPÇÃO LOCAL (recomendada, não toca a cloud) — requer Docker rodando (✔ disponível)
npx supabase start          # baixa a CLI + sobe o stack local (Postgres etc.)
npx supabase db reset        # aplica migrations 0001–0012 (+ seed) no banco LOCAL
pnpm db:types                # gera src/types/db.ts real a partir do schema local

# OPÇÃO REMOTA (alternativa — NÃO nesta fase: exige login/config de acesso)
npx supabase login
npx supabase link --project-ref <REF>
npx supabase gen types typescript --project-id <REF> > src/types/db.ts
```

Depois de gerar os tipos reais: integrar `<Database>` nos 3 clients e corrigir só os erros de `typecheck/lint/build`, tratando os casts como limpeza oportunística (§9-casts).

---

## 9. Casts restantes (para correção oportunística com tipos reais)

Não removidos nesta fase (dependem dos tipos reais — Bloco D). Registrados:

- `src/server/queries/posts.ts` — joins reconstruídos com `as Record<string,unknown>` + `campo as Tipo` (causa-raiz: `db.ts` stub). Maior concentração.
- `src/app/(app)/courses/[courseId]/lessons/[lessonId]/page.tsx` — `lesson.title as string`, `lesson.video_url as string | null`, etc. (dado de aula não tipado).
- `src/app/admin/settings/page.tsx` — `value as never` na montagem do `SettingsMap`.
- `src/app/(app)/community/page.tsx` — `sp.category as PostCategory | "all"`.
- Pontuais em páginas admin/perfil (`as string|number|boolean`).

Todos são **dados** (não quebram runtime hoje); a correção correta é `pnpm db:types` + tipagem dos joins com Zod por query, junto das features que tocarem cada arquivo.

---

## 10. Estado do rate limit

**Call sites (9):** auth por IP — `login` 10/min, `register` 5/min, `resend` 3/min, `forgot` 4/min; por usuário — `post` 12/min, `like`/`react` 60/min, `comment` 20/min, `rsvp` 30/min.

**Diagnóstico:** `Map` in-process (`rate-limit.ts`). Em produção Vercel (serverless) vive **por instância** e some em cold start → **não é limite global confiável**; `x-forwarded-for` é confiável só atrás de proxy que o sobrescreva.

**Decisão (auditoria, sem implementar externo):** classificar e documentar como **best-effort / defesa-em-profundidade**. A proteção **primária** de auth é o **rate-limit nativo do Supabase Auth (GoTrue)**, server-side. O limiter local agrega camada leve anti-flood. **Só** migrar para store compartilhado (Upstash/Redis) ou WAF de borda **se houver evidência de abuso**. Comentário do arquivo corrigido (removida a referência "Hetzner/single-container"). **Comportamento inalterado.**

---

## 11. Resultado typecheck / lint / build

```
pnpm typecheck  → exit 0
pnpm lint       → exit 0
pnpm build      → exit 0 (32 rotas; warning pré-existente de APP_URL=localhost)
```

Idênticos antes e depois. Suíte E2E (`pnpm test:e2e`) **não executada** — exige Supabase (local/cloud) com usuários seed; fora do escopo (não alterar cloud). Invariantes validados por leitura (§1).

---

## 12. Rollback

Nada foi commitado — reverter é trivial:

| Alvo | Rollback |
|---|---|
| Todas as edições de código/docs | `git checkout -- <arquivo>` (ou `git restore .`) — working tree volta a `df23feb` |
| `vercel.txt` no índice | `git add vercel.txt` (readiciona ao índice) |
| `deploy.yml` | reverter o arquivo; readicionar bloco `push:` reativa o auto-deploy |
| `_setup_cloud.sql` / `PROJETO.md` | `git checkout --` (só comentários/doc) |

Como não houve commit/push/deploy/alteração de cloud, **não há efeito colateral remoto** para desfazer.

---

## 13. Recomendação final

Hardening **concluído com sucesso e zero regressão** (typecheck/lint/build verdes antes e depois). As correções são pequenas, proporcionais e preservam o comportamento funcional. **Pronto para iniciar as próximas features.**

Pendências deixadas explícitas (fora desta fase, por decisão): **gerar tipos Supabase reais** (§8 — comando pronto) e **integrar `<Database>` nos clients** logo depois; avaliar **rotação de `vercel.txt`** (§7); os P2/P3 da auditoria seguem oportunísticos.

*Read-only quanto à cloud: nenhuma migration, nenhum SQL executado, nenhum commit/push/deploy.*
