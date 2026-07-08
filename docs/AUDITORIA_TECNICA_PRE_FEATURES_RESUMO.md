> ⚠️ **HISTÓRICO — não usar como estado atual.** Achados deste documento podem já ter sido corrigidos (ex.: award_points, cursos draft, estorno de pontos — resolvidos nas migrations 0010/0031/0032/0035). Estado vigente: docs/AUDIT_POST_RELEASE_*.md (2026-07-08).

# AUDITORIA TÉCNICA PRÉ-FEATURES — Resumo Executivo

> Portal Nexus (módulo `COMUNIDADE/`) · 2026-06-30 · branch `master` · HEAD `df23feb` · **read-only** (nada tocado).
> Documento completo: [AUDITORIA_TECNICA_PRE_FEATURES.md](AUDITORIA_TECNICA_PRE_FEATURES.md)

## Veredito

# ✅ APROVADO COM CORREÇÕES P0/P1

O código está **saudável e pronto para receber features**. **Não há nenhum achado CRÍTICO de código** — os dois CRÍTICOs da baseline anterior (auto-unban/fraude de pontos **SEC-01**; vazamento de aulas draft **SEC-03**) estão **fechados** pelas migrations `0009`/`0010`, o que foi **verificado de forma independente**. Os bloqueadores que restam são **operacionais** (Dashboard Supabase / Vercel), não de código.

## Bateria estática (executada de verdade)

| Check | Resultado |
|---|:---:|
| `pnpm typecheck` | ✅ exit 0 |
| `pnpm lint` | ✅ exit 0 |
| `pnpm build` | ✅ exit 0 (32 rotas) · ⚠️ warning `NEXT_PUBLIC_APP_URL=localhost` |
| `git status` | working tree limpo |
| `pnpm test:e2e` | não executado (fora de escopo; suíte existe) |

## Achados por severidade (após calibração adversarial)

**CRÍTICO: 0** · **ALTO: 3** · **MÉDIO: 15** · **BAIXO: 24** · **COSMÉTICO: 9** · **POSITIVO (verificações OK): ~20**

## Os 3 ALTOs (todos esforço P, majoritariamente verificação)

1. **SEC-DEMO** — `seed.sql`/`_seed_cloud.sql` criam `admin@codex.community`/`codex123!`. **Não há backdoor no código** (grep limpo). Risco condicional ao estado da cloud. → **P0: verificar/neutralizar no Dashboard.**
2. **E-1** — `_setup_cloud.sql` **congelado em 0007**: um provisionamento novo nasceria sem os fixes de segurança (0009/0010) e sem `is_owner`/`social_links`/`reactions`. → **P0: confirmar 0008–0012 aplicadas na cloud; usar `migrations/` como fonte.**
3. **F-15** — `deploy.yml` (Hetzner/SSH) ainda ativo enquanto produção é Vercel. ALTO só se o servidor estiver vivo. → **P1: desabilitar.**

## Principais MÉDIOs

- **Rate-limit in-memory** ineficaz sob serverless + XFF forjável (B-7/C-11) → store compartilhado antes de cadastro público.
- **Like com contador stale** no clique duplo (C-1, transitório) → updater funcional.
- **Perda de tipagem na borda Supabase** (C-7, causa-raiz `db.ts` stub `any`) → `pnpm db:types`.
- **Erro cru do Postgres vaza ao usuário** (C-6).
- **Dependências mortas** `react-hook-form`, `@tanstack/react-query`, `date-fns`, 3 Radix (0 imports) — contradizem o README.
- **Listas sem paginação** (`admin/members`, `calendar`) e contagem de feed O(linhas) — só mordem em escala.
- **a11y de acabamento** (aria-label, SheetTitle, touch targets WCAG 2.2).

## O que NÃO mexer (evitar overcoding)

Memoização/virtualização do feed sem medição · índices em tabelas pequenas · `ThemeProvider` Context · wrapper genérico de autz · `useFormComposer`/CrudKit · remover defesa em profundidade (proxy/layout/RLS) · reescrever `db.ts` à mão.

## Forças confirmadas (manter)

SEC-01/03 fechados · owner protegido por RLS+RPC (não só UI) · `getUser()` · service-role isolado `server-only` · anti-SSRF/allowlist · CSP/HSTS · banido bloqueado em 3 camadas · `award_points` idempotente e atômico · RSC disciplinado sem Provider no root · tema sem FOUC (fonte única) · otimismo isolado ao card · `EmptyState` reusado · zero código comentado/TODO.

## Notas (0–10)

Arquitetura 8,0 · TypeScript 6,5 · Segurança 8,0 · Banco/RLS 8,0 · Frontend 8,0 · Desempenho 7,5 · Testes 6,0 · Documentação 6,5 · Manutenção 8,0 · Prontidão p/ features 7,5 · **Global ~7,5.**

## Próximos passos (ordem)

1. **P0 (antes de codar):** backup + confirmar migrations na cloud + neutralizar demo + Auth URLs/`APP_URL` + fonte única de deploy.
2. **P1 (~1 dia):** rate-limit compartilhado (se cadastro público), `vercel.txt`, `requireActiveProfile`, like-stale, desativar `deploy.yml`.
3. **P2 (oportunístico, junto da área):** erro amigável, a11y, paginação, deps mortas, unificações pontuais, sincronizar docs.
4. **Cedo:** `pnpm db:types` (resolve C-7 e protege todas as features novas).

*Read-only: nenhum código, banco ou deploy foi tocado.*
