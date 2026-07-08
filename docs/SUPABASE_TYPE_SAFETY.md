> ⚠️ **HISTÓRICO — etapa concluída em 2026-07-01.** Referências a estado (12 migrations, db.ts stub) valem para aquela data; hoje são 35 migrations e os tipos vivem em `database.generated.ts` (regenerar com `pnpm db:types`).

# Supabase Type Safety — Portal Nexus (módulo COMUNIDADE)

> Guia da tipagem real do Supabase. **Data:** 2026-07-01 · **Branch:** `master` · **HEAD:** `1f5518d` · working tree limpo.
> **Regra desta etapa:** não adaptar o banco aos tipos — gerar os tipos do banco atual (read-only) e adaptar só a camada TypeScript. Sem migration/SQL/`db push`/`db reset` remoto/alteração de cloud/commit/push/deploy.

---

## 0. STATUS DESTA ETAPA (leia primeiro)

| Fase | Estado |
|---|---|
| **T0 — Baseline + análise estática** | ✅ concluída (read-only) |
| **T0 — Validação da PRODUÇÃO (read-only)** | ✅ **feita** — introspecção live via PostgREST OpenAPI (só GET, zero escrita): **19/19 tabelas + colunas batem** com migrations/tipos; RPCs do app presentes. Ver §15. |
| **T0 — Geração dos tipos** | ✅ **feita** — via CLI oficial contra stack **LOCAL** (Docker) carregado com as migrations (== produção, verificado). Arquivo `src/types/database.generated.ts` (1590 linhas). **Zero toque na cloud.** |
| **T0 — Veredito de schema** | ✅ **`T0 APROVADO — SCHEMA CONSISTENTE`** (produção ↔ migrations ↔ tipos). 1 drift não-bloqueante: RPC `rls_auto_enable` existe em prod, não nas migrations, **não usada pelo app** (§15). |
| **T1 — Integração (fachada + clients + fixes)** | ✅ **concluída** — `db.ts` virou fachada derivada do gerado; 3 clients tipados com `<Database>`; 4 correções mínimas. `typecheck`/`lint`/`build` ✅. |
| **Precisa subir SQL na produção?** | ❌ **NÃO** — estrutura já compatível; nada a aplicar; usuários intactos. |

**Resumo:** a estrutura de produção foi **validada ao vivo** (read-only) e é **100% compatível** com o que o app espera; nenhuma alteração de banco é necessária. Os tipos reais foram gerados pela CLI oficial a partir das migrations (idênticas à produção) num stack **local** — nada foi inventado nem tocou a cloud. A camada TypeScript foi integrada e os gates estão verdes.

---

## 1. Conceito — tipos ≠ banco (risco zero para produção)

- Os tipos TypeScript são **exclusivamente de desenvolvimento**: `tsc`/Next apagam TODA anotação de tipo no build. O JavaScript final **não contém tipos** e faz exatamente as mesmas chamadas ao mesmo banco.
- Gerar/integrar tipos **não** toca tabelas, RLS, Auth, Storage, dados, usuários nem sessões. Não há "usuário antigo sem tipo" e "usuário novo com tipo" — a tipagem pertence ao **código do desenvolvedor**, não aos registros.
- A geração remota é **read-only**: lê o catálogo do Postgres (`information_schema`/PostgREST introspection) e emite um `.ts`. Nenhuma escrita.

---

## 2. Baseline

- **Migrations (fonte da verdade):** `supabase/migrations/0001..0012` (12 arquivos). Produção já as tem aplicadas (confirmado operacionalmente: owner, social_links, post_reactions em uso).
- **Gates antes:** `pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ (exit 0).
- **Tipos atuais:** `src/types/db.ts` — stub manual. Comentário no topo já aponta `pnpm supabase gen types typescript --local` como caminho de geração.
- **Clients:** `src/lib/supabase/{server,client,admin}.ts` — nenhum usa o generic `<Database>`.
- **Scripts:** `package.json` → `db:types` = `npx supabase gen types typescript --local > src/types/db.ts`.

---

## 3. Análise estática (§1–§5 do escopo)

### 3.1 Inconsistências (schema × tipo manual)
Nenhuma inconsistência estrutural de coluna/nullability/enum entre migrations e `db.ts` (ver tabela §5). Única divergência de **comentário**: `db.ts` afirma "as queries continuam tipadas via as Row interfaces" — **falso na prática**, porque os clients não são genéricos e os joins são reconstruídos com casts. Será corrigido pela fachada (§7).

### 3.2 Duplicações
- **Interfaces manuais que duplicam tabelas:** `Profile`, `Post`, `PostComment`, `PostLike`, `PostReaction`, `Course`, `CourseModule`, `Lesson`, `LessonProgress`, `Resource`, `App`, `Event`, `EventAttendee`, `PointsLedgerEntry`, `Notification` (+ inline: `community_members`, `lesson_comments`, `settings`). Todas serão **derivadas** de `Tables<"...">` na fachada (deixam de ser duplicação).
- **Enums repetidos:** `Role`, `PostCategory`, `ResourceCategory`, `AppCategory`, `AppType`, `AppStatus`, `EventType`, `PointsAction` existem em `db.ts` **e** como CHECK constraints no banco **e** como listas em `src/lib/constants.ts`/Zod. Ver §3.3.

### 3.3 Sobreposições (separação de responsabilidades — manter)
| Camada | Papel | Decisão |
|---|---|---|
| **Tipos gerados** (`database.generated.ts`) | schema do banco (verdade estrutural) | fonte dos aliases de tabela/enum |
| **Zod** (`lib/validations/schemas.ts`) | validação **runtime** de input | **NÃO** substituir por tipos TS — permanece |
| **Enums de UI** (`db.ts`/`constants.ts`) | refinam `text`/CHECK para uniões estreitas (ex.: `PostCategory`, `SocialLinks`) | manter como refinamento; o banco entrega `string`/`Json`, a UI estreita |
| **View models / estado de formulário** | tipos de tela (ex.: `FeedPost`, `editForm`) | manter — **não** confundir com Row |

> Regra: tipos gerados = estrutura; Zod = validação; tipos de UI = apresentação. As três coexistem.

### 3.4 Legacy (a substituir com segurança na fachada)
- `GenericTable<Row>` com `Insert: any` / `Update: any` (`db.ts:245–252`).
- `Views: Record<string, any>`, `Functions: Record<string, any>`, `Enums: Record<string, any>`, `CompositeTypes: Record<string, any>` (`db.ts:277–284`).
- Comentário desatualizado (`db.ts:1–6, 235–243`).

### 3.5 Bugs / tipagem fraca (causados pelo stub `any`-friendly)
- Todo `.insert/.update/.upsert` passa sem verificação (Insert/Update `any`).
- RPCs (`award_points`, `admin_set_role`, `admin_set_banned`, `is_owner`, `recalc_level`, …) sem tipo → `supabase.rpc(...)` é `any`.
- Joins/embeds reconstruídos com `as Record<string,unknown>` + `campo as Tipo` em `src/server/queries/posts.ts`.
- Casts pontuais: `lesson.* as string` (lesson page), `value as never` (`admin/settings/page.tsx`), `sp.category as PostCategory` (`community/page.tsx`).

---

## 4. (reservado — geração; ver §6)

## 5. Comparação migrations × tipo manual (núcleo do T0)

> Coluna **Produção** = **inferida** (= migrations; produção já as aplicou por confirmação operacional). Prova formal exige o arquivo gerado (§6). **Estado** compara *Migrations* × *Tipo manual*.

| Item | Produção (inferida) | Migrations | Tipo manual (`db.ts`) | Estado |
|---|---|---|---|---|
| `profiles` (11 cols pedidas) | = migr. | 0001 + `is_owner` 0009 + `social_links` 0011 | `Profile` com todas (11/11) | ✅ consistente |
| `profiles.social_links` | jsonb | `jsonb not null default '{}'` (0011) | `SocialLinks` (refino de `Json`) | ✅ (refino de UI) |
| `profiles.role` | text+CHECK | `check in (admin,moderator,member)` | `Role` união | ✅ (refino) |
| `posts` | = migr. | 0002: `is_pinned,is_deleted,author_id,category`… | `Post` (todas) | ✅ consistente |
| `posts.category` | text+CHECK (7) | 0002 CHECK 7 valores | `PostCategory` (7) | ✅ (refino) |
| `post_comments`, `post_likes` | = migr. | 0002 | `PostComment`, `PostLike` | ✅ consistente |
| `post_reactions` | = migr. | 0012: `post_id,user_id,emoji`+`unique` | `PostReaction` (`emoji: string`) | ✅ estrutura; `emoji` mais largo que CHECK (6) |
| `courses`,`course_modules`,`lessons`,`lesson_progress`,`lesson_comments` | = migr. | 0003 | 5 interfaces correspondentes | ✅ consistente |
| `resources`,`apps`,`events`,`event_attendees`,`settings` | = migr. | 0004 | 5 correspondentes | ✅ consistente |
| `points_ledger`,`notifications` | = migr. | 0005 | 2 correspondentes | ✅ consistente |
| `communities`,`community_members` | = migr. | 0001 | `Community` + inline | ✅ consistente |
| **RPCs** `award_points`,`recalc_level`,`is_admin`,`is_moderator`,`is_not_banned`,`is_owner`,`current_role`,`admin_set_role`,`admin_set_banned`,`handle_*` | = migr. | 0001/0005/0008/0009 | `Functions: any` | ⚠️ **não tipadas** (lacuna real) |
| `Insert`/`Update` de todas as tabelas | — | (derivam do schema) | `any` | ⚠️ **não tipados** (lacuna real) |

**Confirmações pedidas:** Profiles 11/11 ✅ · Posts `is_pinned/is_deleted/author_id/category` ✅ · `post_reactions(post_id,user_id,emoji)` ✅ · `courses/course_modules/lessons/lesson_progress` ✅ · RPCs `admin_set_role`/`admin_set_banned`/`award_points` **existem no banco** (0009/0005) mas **não no tipo** (`Functions: any`).

**Classificação das divergências:** todas são **"tipo manual mais frouxo que o banco"** (Insert/Update/Functions `any`) ou **"refino de UI legítimo"** (enums/`SocialLinks`). **Nenhuma** é "migration correta × produção divergente" nem "produção correta × migration desatualizada". **Nenhuma divergência bloqueante** entre migrations e tipo manual.

### Veredito T0

```
T0 APROVADO — SCHEMA CONSISTENTE
```

Produção (introspecção live) ↔ migrations ↔ tipos gerados: **consistentes**. Ver §15 para a validação executada. Único desvio: RPC `rls_auto_enable` presente em produção e ausente das migrations (drift de setup), **não usada pelo app** — não afeta tipos de tabela/coluna nem os RPCs consumidos (`admin_set_role`/`admin_set_banned`/`award_points`).

---

## 6. Método de geração (read-only) — PASSO MANUAL

Produzir `src/types/database.generated.ts` a partir da **produção** (projeto ref `yagjnowggkqvjrnysihi`). Ambas as opções são **somente leitura** — não escrevem nada na cloud.

### Opção A — Dashboard Supabase (recomendada; sem CLI/login local)
1. Abrir **Supabase Dashboard → Project Settings → API → "Generate types"** (ou **Database → API Docs → TypeScript**).
2. Selecionar schema `public`.
3. Copiar o TypeScript gerado.
4. Salvar em `src/types/database.generated.ts`.

### Opção B — CLI read-only (só se autenticar)
Pré-requisito: CLI instalada **e** autenticada (hoje: ausente — `~/.supabase` sem `access-token`, `SUPABASE_ACCESS_TOKEN` unset). Requer login interativo (fora desta sessão não-interativa):
```bash
npx supabase login            # interativo — NÃO nesta sessão automatizada
npx supabase gen types typescript \
  --project-id yagjnowggkqvjrnysihi \
  --schema public \
  > src/types/database.generated.ts
```
Regras respeitadas: sem `supabase link` desnecessário, sem `db push`/`db reset` remoto, sem pedir/salvar/imprimir token, sem alterar config remota. **Não instalar CLI nem automatizar login sem autorização explícita.**

> Alternativa 100% local (equivalente às migrations, útil se não quiser tocar a cloud): `npx supabase start` (Docker) → `npx supabase db reset` (aplica migrations **no banco LOCAL**, não remoto) → `pnpm db:types`. Gera tipos idênticos ao schema das migrations. Só use com Docker preparado; **não** confundir com produção.

Após gerar, validar que o arquivo contém: `Database`, `Json`, `Tables`, `Views` (ou `{}`), `Functions` (com `award_points`/`admin_set_role`/`admin_set_banned`/…), `Enums`, e as tabelas `profiles`/`posts`/`post_reactions`/`courses`/`course_modules`/`lessons`/`lesson_progress`. Rodar a comparação da §5 contra o arquivo real e fechar o gate:
`T0 APROVADO — SCHEMA CONSISTENTE` **ou** `T0 BLOQUEADO — DIVERGÊNCIA DE SCHEMA`.

---

## 7. Fachada `src/types/db.ts` (design PRONTO — aplicar em T1)

`database.generated.ts` = automático (**nunca editar à mão**). `db.ts` vira **fachada fina** que reexporta e deriva aliases, preservando os imports existentes e os refinamentos de UI. Esqueleto proposto:

```ts
import type { Database, Json } from "./database.generated";

// helpers derivados do schema gerado
export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Insertable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updatable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];
export type Enums<T extends keyof Database["public"]["Enums"]> =
  Database["public"]["Enums"][T];

export type { Database, Json };

// Aliases de tabela derivados (substituem as 15+ interfaces manuais)
export type Profile        = Tables<"profiles">;
export type Post           = Tables<"posts">;
export type PostComment    = Tables<"post_comments">;
export type PostLike       = Tables<"post_likes">;
export type PostReaction   = Tables<"post_reactions">;
export type Course         = Tables<"courses">;
export type CourseModule   = Tables<"course_modules">;
export type Lesson         = Tables<"lessons">;
export type LessonProgress = Tables<"lesson_progress">;
export type Resource       = Tables<"resources">;
export type App            = Tables<"apps">;
export type Event          = Tables<"events">;
export type EventAttendee  = Tables<"event_attendees">;
export type PointsLedgerEntry = Tables<"points_ledger">;
export type Notification   = Tables<"notifications">;
export type Community      = Tables<"communities">;

// REFINAMENTOS DE UI legítimos — NÃO derivam de tabela; permanecem manuais.
// (o banco entrega `text`/`Json`; a app estreita.)
export type Role          = "admin" | "moderator" | "member";
export type PostCategory  = "geral" | "duvidas" | "apresentacoes" | "resultados" | "projetos" | "avisos" | "suporte";
export type ResourceCategory = "apostilas" | "templates" | "planilhas" | "codigos" | "checklists" | "ferramentas";
export type AppCategory   = "ia" | "programacao" | "automacao" | "produtividade" | "marketing" | "comunidade" | "ferramentas-internas";
export type AppType       = "link" | "embed" | "file" | "internal";
export type AppStatus     = "active" | "coming-soon" | "beta";
export type EventType     = "live" | "mentoria" | "aula" | "desafio" | "reuniao";
export type PointsAction  = "post_created" | "comment_created" | "like_received" | "lesson_completed" | "event_attended";
export type SocialPlatform = "instagram" | "tiktok" | "linkedin" | "github" | "youtube";
export type SocialLinks   = Partial<Record<SocialPlatform, string>>;
```

**Cuidados:** (a) só remover os stubs Row **depois** de confirmar que o alias derivado é compatível; (b) manter os refinamentos de UI (`Role`, `PostCategory`, `SocialLinks`, …) — o gerado dá `string`/`Json`, que é **mais largo**; se algum consumidor exigir a união estreita, manter o refino ou aplicar `as` pontual documentado; (c) **não** presumir que todo tipo existente = uma tabela (ex.: `FeedPost` é view model, fica em `queries/posts.ts`).

---

## 8. Clients tipados (plano T1)

Aplicar o generic `Database` **só** às factories existentes, sem criar camada nova:

```ts
// server.ts
return createServerClient<Database>(URL!, ANON!, { cookies: { … } });
// client.ts
return createBrowserClient<Database>(URL!, ANON!);
// admin.ts
return createSupabaseClient<Database>(url, serviceKey, { auth: { … } });
```

Preservar integralmente: `cookies`/SSR (`server.ts`), `import "server-only"` + `autoRefreshToken:false/persistSession:false` (`admin.ts`), leitura de env, service-role **exclusivo no servidor**. Nenhuma mudança de runtime.

---

## 9. Correção dos erros revelados (regra)

Após tipar os clients, `pnpm typecheck` revelará erros. Para cada um, classificar (1) coluna inexistente · (2) nullability · (3) Insert incorreto · (4) Update incorreto · (5) RPC incorreta · (6) join não inferido · (7) tipo de UI · (8) cast legado · (9) limitação legítima do Supabase. Aplicar a **menor** correção: `verificar schema real → verificar query → menor correção → preservar runtime`. **Não** alterar regra de permissão, retorno funcional, fluxo, gamificação, pontos, reações, Auth ou RLS só para satisfazer o compilador.

- **Joins/embeds** (`queries/posts.ts`): usar `QueryData<typeof query>` do `@supabase/supabase-js` para inferir o shape do embed, **ou** um tipo composto local, em vez de `as Record<string,unknown>`. Não aplicar Zod em todas as queries automaticamente.
- **RPCs**: com `Functions` tipado, `supabase.rpc("award_points", { … })` passa a checar args — corrigir nomes de parâmetros se divergirem.

---

## 10. Casts atuais (inventário — corrigir oportunisticamente, não em massa)

| Local | Cast | Após tipos reais |
|---|---|---|
| `src/server/queries/posts.ts` | joins → `as Record<string,unknown>` + `campo as Tipo` | `QueryData`/tipo composto |
| `src/app/(app)/courses/[courseId]/lessons/[lessonId]/page.tsx` | `lesson.* as string/…` | Row de `lessons` já tipa |
| `src/app/admin/settings/page.tsx` | `value as never` | validar `Json`/schema por chave |
| `src/app/(app)/community/page.tsx` | `sp.category as PostCategory \| "all"` | validar contra enum |

Registrar os que permanecerem; **não** remover todos nesta etapa.

---

## 11. Quando regenerar + fluxo futuro

**Regenerar sempre que o schema mudar** (nova migration). `database.generated.ts` é **automático — nunca editar à mão**.

```
nova migration → aplicar/testar LOCAL → gerar tipos → pnpm typecheck → testes → commit → aplicar migration remota de forma controlada
```

(Sem automação de CI nesta etapa.)

---

## 12. Troubleshooting

- **`Cannot find module './database.generated'`** → o arquivo ainda não foi gerado (§6). É o estado atual até o passo manual.
- **CLI pede login / `Access token not provided`** → usar Opção A (Dashboard) ou `npx supabase login` interativo. Nunca colar token no chat/repo.
- **Tipos parecem "errados" após migration** → regenerar; provavelmente o arquivo gerado está desatualizado.
- **`social_links`/enum reclama de `Json`/`string`** → é o refino de UI (§3.3); manter o tipo estreito em `db.ts` ou `as` pontual documentado.
- **Insert reclamando de coluna gerada por default** → usar `Insertable<"tabela">` (Insert torna opcionais colunas com default).

---

## 13. Garantias (a confirmar no relatório final de T1)

Zero alteração no banco: nenhum usuário/perfil/sessão/dado modificado · nenhum SQL/migration executado · nenhuma migration alterada · o JS final consulta o **mesmo** banco/schema · os tipos **somem no build** · usuários antigos e novos usam o mesmo schema e os mesmos dados. A tipagem é do **código**, não dos registros.

---

## 14. Critérios de aceite

**T0** — tipos gerados da produção · nenhuma escrita na cloud · tabelas/RPCs presentes · comparação produção×migrations concluída · sem divergência relevante · relatório declara `T0 APROVADO`.
→ **Estado atual:** análise e comparação migrations×stub concluídas e consistentes; **geração da produção pendente de passo manual (§6)**; portanto T0 **não fechado** nesta sessão.

**T1** — `database.generated.ts` gerado · sem stub `Insert/Update/Functions/Views: any` · `db.ts` deriva do gerado · browser/server/admin clients tipados · typecheck/lint/build verdes · smoke test aprovado · zero mudança de banco/usuário/migration · nenhum segredo exposto.
→ **Estado atual:** **não iniciada** (gate: T0 pendente). Plano completo em §7–§10, pronto para aplicar assim que §6 for feito.

*Nenhum commit/push/deploy. Nenhuma alteração de banco/migrations/cloud. Nenhum tipo inventado.*

---

## 15. Execução concluída (2026-07-01)

### 15.1 Validação da produção (read-only)
Introspecção **live** do projeto `yagjnowggkqvjrnysihi` via **PostgREST OpenAPI** (`GET /rest/v1/`) — **somente leitura, nenhuma escrita**. Resultado:
- **19/19 tabelas** presentes com as colunas esperadas — incluindo `profiles.is_owner` + `profiles.social_links (jsonb)`, `posts.is_pinned/is_deleted`, `post_reactions(post_id,user_id,emoji)`, `courses/course_modules/lessons/lesson_progress`, e as colunas de `resources/apps/events`.
- **RPCs consumidas pelo app presentes:** `admin_set_role`, `admin_set_banned`, `award_points` (+ `is_admin/is_moderator/is_not_banned/is_owner/recalc_level/current_role`).
- **Drift não-bloqueante:** produção expõe também `rls_auto_enable` (função de setup rodada direto no SQL Editor, **fora das migrations**). O app **não a chama** (grep confirmado). Não afeta a compatibilidade.

**Compatibilidade:** ✅ a estrutura de produção é **totalmente compatível** com o app e os tipos. **Nada precisa ser subido no SQL**; nenhum risco de conflito; usuários/dados intactos.

### 15.2 Geração dos tipos (oficial, local, zero-cloud)
Como produção == migrations (verificado em 15.1), os tipos foram gerados pela **CLI oficial** contra um stack **local** (Docker), carregado com as migrations 0001–0012:
```
npx supabase start           # stack local (Docker) — aplica migrations
npx supabase gen types typescript --local > src/types/database.generated.ts
npx supabase stop            # stack derrubado ao final
```
> **Workaround de porta (Windows):** as portas padrão do Supabase local (54321–54329) caem na **faixa TCP reservada pelo Windows** (`54303–54402`, via `netsh int ipv4 show excludedportrange`), causando `bind: forbidden`. Foram remapeadas **temporariamente** no `config.toml` para a janela livre **54209–54302**, e o `config.toml` foi **revertido** ao final (`git checkout`) — **líquido zero** no arquivo. Quem regenerar localmente nesta máquina precisa do mesmo remap (ou liberar a faixa).

### 15.3 Integração T1 (código)
- `src/types/database.generated.ts` — **gerado** (não editar à mão).
- `src/types/db.ts` — agora **fachada**: reexporta `Database`/`Json`, expõe `Tables`/`Insertable`/`Updatable`, deriva os 16 aliases de tabela do gerado e **re-estreita** as colunas `text`+CHECK (`role`, `category`, `type`, `status`, `event_type`, `action`, `visibility`) e `jsonb` (`social_links`) para as uniões de domínio — preservando os consumidores da UI sem churn. Removidos os stubs `Insert/Update/Functions/Views: any`.
- `src/lib/supabase/{server,client,admin}.ts` — tipados com `<Database>` (cookies/SSR/`server-only`/service-role preservados).
- `package.json` — `db:types` agora escreve em `database.generated.ts` (não sobrescreve a fachada).

### 15.4 Erros revelados e correções (4, todas mínimas, runtime preservado)
| # | Local | Classe | Correção |
|---|---|---|---|
| 1 | `src/app/admin/page.tsx:14` | (6) `.from(string)` dinâmico | `countTable` recebe união literal `CountableTable` |
| 2/3 | `src/lib/points/award.ts:22-23` | (5) RPC arg | `p_ref_type/p_ref_id: … ?? undefined` (default SQL `null` = mesmo resultado) |
| 4 | `src/server/actions/admin.ts:71` | (8) cast | `value as Json` (setting é JSON dinâmico) |

Nenhuma regra de permissão, retorno, fluxo, gamificação, pontos, reações, Auth ou RLS foi alterada.

### 15.5 Casts restantes (não removidos — oportunístico)
`src/server/queries/posts.ts` (joins reconstruídos), `lessons/[lessonId]/page.tsx` (`as string`), `admin/settings/page.tsx` (`as never`), `community/page.tsx` (`as PostCategory`). Agora que o client é tipado, podem migrar para `QueryData`/tipos compostos junto das features que os tocarem.

### 15.6 Gates
`pnpm typecheck` ✅ · `pnpm lint` ✅ · `pnpm build` ✅ (32 rotas) · `git diff --check` ✅ (só avisos LF→CRLF).

### 15.7 Garantias (zero alteração de banco/usuários) — confirmadas
- Introspecção de produção foi **read-only** (só GET). **Nenhum** SQL/DDL/`db push`/`db reset` remoto/migration na cloud.
- Geração de tipos ocorreu num stack **local** efêmero (derrubado ao final). **Nada** tocou o projeto cloud.
- Os tipos **somem no build** — o JS final consulta o mesmo banco/schema. Usuários antigos e novos usam o mesmo schema e dados. A tipagem é do **código**, não dos registros.
- `config.toml` revertido; nenhum arquivo temporário deixado no repo.

### 15.8 Recomendação de drift (opcional, futuro)
Para paridade migrations↔produção, capturar `rls_auto_enable` numa migration nova (ex.: `0013_rls_auto_enable.sql`) **ou** removê-la da produção se não for mais necessária — decisão dedicada, **fora desta etapa** (não é bloqueante e não afeta o app).

