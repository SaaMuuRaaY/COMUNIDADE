> ⚠️ **HISTÓRICO — não usar como estado atual.** Achados deste documento podem já ter sido corrigidos (ex.: award_points, cursos draft, estorno de pontos — resolvidos nas migrations 0010/0031/0032/0035). Estado vigente: docs/AUDIT_POST_RELEASE_*.md (2026-07-08).

# NEW FEATURES — MASTER AUDIT (READ-ONLY)

**Data:** 2026-07-04 · **Branch:** master · **HEAD:** caaa13e · **Working tree:** limpa

## Metodologia & Agentes
Auditoria read-only por 3 agentes Explore (model: haiku), sem escrever código: (1) Biblioteca 2.0; (2) Onboarding + Descoberta; (3) Recompensas + antifraude + cross-cutting. Consolidação + pente adversarial anti-overcoding pelo agente principal. Verificação P0 de `award_points` feita contra o banco LOCAL (privilégios efetivos).

## 0 — Baseline
- Stack: Next 16 / React 19 / TS / Tailwind 4 / shadcn / Supabase (Auth/PG/Storage/Realtime/RLS) / Vercel / pnpm.
- Migrations 0001–0025 aplicadas. Gates: `typecheck` ✅ · `lint` ✅ · `build` ✅.
- Módulos: posts/comentários/likes/reações (0002/0012), cursos (0003), recursos/apps/eventos (0004), gamificação/notifications/settings (0005), RLS (0006), storage (0007), triggers de notificação (0008), segurança de perfil/owner (0009), RLS de curso (0010), social links (0011), canais/gestão contextual (0013-0018), chat realtime (0019), DM (0021), saved (0023), conexões (0024), SEC-02 (0025).
- Chat Network: fora deste escopo (sem dependência direta).

## 1 — Inconsistências
- **`/calendar`** mostrava eventos passados (sem filtro) e marcava "em andamento" como "Encerrado" (`starts_at` em vez de `ends_at`). → **CORRIGIDO** nesta etapa (filtro por `ends_at` + flag `ended`).
- `events` sem coluna `status`/cancelado (só hard-delete) — cancelamento explícito inexistente (MVP: mostra futuros publicados).
- Labels visuais "Biblioteca/Aplicativos" vs rotas técnicas `/resources` `/apps` — ok, não renomear.

## 2 — Duplicações
- Padrão de upload (avatar) reusável para capas via `useImageUpload` — **não duplicar**; extrair `CoverUploader`.
- `slugify()` já existe (utils.ts) — reusar, não recriar.
- Query de "próximos eventos" existe em `admin/page.tsx` — extrair `getUpcomingEvents()` em vez de duplicar.
- Agregação de likes/comments em `getFeedPosts` — reusar/estender; NÃO criar segunda fonte de verdade pra trending (usar 1 RPC).

## 3 — Sobreposições
- RLS + Server Actions + (futuras) RPCs de contador/pontos = defesa em profundidade válida DESDE que a RPC não confie no cliente (ver X2).
- `profiles.points`/`level` (materializado) vs `points_ledger` (fonte) — múltipla fonte de verdade aceitável (ledger é a verdade; profiles é cache), MAS o ranking mensal deve sair do LEDGER, não de profiles.points (all-time).

## 4 — Legacy
- `_seed_cloud.sql` já removido (SEC-02); `_setup_cloud.sql` removido pelo IAGO. `seed.sql` = LOCAL-DEV-ONLY.
- Nenhum arquivo legacy novo recomendado pra remoção sem evidência.

## 5 — Bugs & Tipagem (achados)

### X2 — award_points: auto-premiação (CRÍTICO, CONFIRMADO)
- **Evidência (banco local):** `has_function_privilege('authenticated','public.award_points(uuid,text,integer,text,uuid)','execute') = true`; idem `anon`; `routine_privileges` = `PUBLIC:EXECUTE`.
- `award_points` (0005:40) é SECURITY DEFINER, `search_path=public`, **sem guarda interna** (confia em `p_user`, `p_points`). O app chama via `createAdminClient()` (service role) — então NÃO precisa do grant a authenticated.
- **Reprodução:** usuário autenticado (ou anônimo) faz `POST /rest/v1/rpc/award_points` com `p_user=<alvo>`, `p_points=<qualquer>`, `p_ref_id=<uuid aleatório>` → insere no ledger + `profiles.points += p_points`. Idempotência não protege (client varia `p_ref_id`).
- **Impacto:** pontos/level/ranking manipuláveis HOJE; bloqueia Feature D.
- **Correção mínima (PROPOSTA, não aplicada):**
  ```sql
  revoke execute on function public.award_points(uuid,text,integer,text,uuid) from public;
  grant  execute on function public.award_points(uuid,text,integer,text,uuid) to service_role;
  ```
  Não quebra: app usa service role; triggers (`handle_like_award`) rodam como owner (postgres) → executam a função independ2 do grant a authenticated. Aplicar via migração dedicada (ex.: `0026_secure_award_points.sql`) — decisão/apply do IAGO.
- **Critério de aceite:** `has_function_privilege('authenticated', ...) = false`; app pontua normalmente; RPC direta por authenticated retorna permission denied.

### X4 — Soft-delete não reverte pontos (ALTO, p/ D)
`deletePostAction` (posts.ts:100) / `deleteCommentAction` (:312) só marcam `is_deleted=true`. Pontos de post (10)/comentário(5)/like(2) permanecem no ledger + profiles. Correção (F1 de D): trigger/RPC de revert. Critério: deletar conteúdo remove os pontos correspondentes.

### X3 — Sem governança de pontos (ALTO, p/ D)
`points_ledger` sem policy UPDATE/DELETE (0006); admin não ajusta/desclassifica. Correção (F1 de D): RPC `admin_adjust_points(user, delta, reason)` (SECURITY DEFINER, guarda is_admin/is_owner, auditável). Critério: admin ajusta com log; user não.

### X5 — Higiene (MÉDIO/cosmético)
`select("*")` em ~9 admin pages (expõe colunas, frágil a refactor); `as never` em `admin/settings/page.tsx:20`. Cleanup oportunístico (não bloqueia).

### Positivos (não regridem)
Like no próprio post NÃO pontua (`handle_like_award` checa autor≠user, 0005:85). `points_ledger` idempotente + indexado `(user_id, created_at desc)`. Rate-limit em Upstash (fallback). RLS madura. `award_points` chamado só via service role no app.

## Auditoria por Feature (resumo — detalhe de A em FEATURE_A_LIBRARY_2_AUDIT.md)

### A — Biblioteca 2.0
Falta `slug`/`cover_url`/`click_count` em `resources`/`apps`; rotas `/[slug]`; UPDATE de `apps` (só create/delete). Reuso: slugify, useImageUpload, RLS (resources=mod, apps=admin). Contador = coluna agregada + RPC atômica (+1, sem valor do cliente, sem pontos, falha não bloqueia acesso). Bucket a decidir na F1 (reuso vs `content-covers`). **Esforço P** (rotas [slug] = M). Risco baixo.

### B — Onboarding/Governança
`comece-por-aqui` = feed simples. FAQ/regras/termos/privacidade já ESTÁTICOS (manter, sem CMS). Falta `member_onboarding` (tabela), accordion (ui), aceite versionado. Onboarding não bloqueante (redirect só no 1º acesso). **Esforço M.**

### C — Descoberta/Atividade
Eventos futuros + RSVP reusáveis (`admin/page.tsx` query, RsvpButton). Trending: `getFeedPosts` agrega em JS (ok p/ feed); precisa 1 RPC `get_trending_posts` (hot_score híbrido, 7d, exclui soft-deleted, mín. 2 interações, limit 5) + cache 60-180s. **NÃO** materialized view/cron/Redis/tabela trending. Índice só após EXPLAIN. **Esforço P/M.**

### D — Recompensas Mensais
Ledger permite ranking mensal read-only (`date_trunc('month')` + índice existente). Bloqueado por X2/X3/X4. Primeira versão: ranking read-only + seleção/entrega MANUAL. **Esforço G.**

## Banco / Storage / RLS / Performance / Segurança
- **Banco:** migrations propostas — A: 0026 (slug/cover/counter/RPCs); B: 0027 (member_onboarding); C: 0 ou índice; D: 2+ (secure award_points já é P0; revert; admin_adjust). Nenhuma destrutiva.
- **Storage:** buckets 0007 (avatars, resources, apps, course-covers). Decisão de bucket de capa na F1 de A.
- **RLS:** madura; ajustes: resources/apps (permitir update do próprio papel + coluna cover), points_ledger (governança em D), member_onboarding (own) em B.
- **Performance:** trending é o único ponto quente (mitigado por RPC + cache). Sem N+1 novo se seguir os padrões.
- **Segurança:** X2 é o item P0. Demais RLS ok.

## Overcoding — guarda
Evitar: tabela de eventos de clique (usar coluna agregada), CMS de acordos (estáticos), wizard de onboarding (form curto), materialized view/cron/Redis/motor de recomendação (trending = RPC), automação de recompensas (manual no MVP), abstração de "conteúdo genérico" resources+apps (manter separados).

## Riscos
- Aplicar Feature D sem X2-X4 = premiar fraude. **Mitigado pela ordem** (D por último) + correção P0 de X2.
- Trending mal indexado = perf. **Mitigado** por EXPLAIN antes de índice + cache.
- Slug instável quebraria links. **Mitigado** por slug estável + fallback id + (futuro) redirect.
