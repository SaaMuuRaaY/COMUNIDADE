# AUDITORIA PÓS-RELEASE — ROADMAP DO PRÓXIMO CICLO

**Data:** 2026-07-08 · Baseado exclusivamente em achados verificados (TECHNICAL/SECURITY) e oportunidades avaliadas (FEATURE_OPPORTUNITIES).
**Regra:** nenhuma fase avança sem aprovação explícita; todo gate padrão (typecheck/lint/build/e2e/diff/status) se aplica ao fim de cada fase.

---

## BLOCO 0 — Correções e hardening — ✅ **CONCLUÍDO em 2026-07-08**

Executado integralmente. Gates: `typecheck` ✅ `lint` ✅ `build` ✅ `test:e2e` **53/53** ✅ `diff --check` ✅. Aguardando aprovação de commit. Só o item 0.1 (operacional, fora do repo) segue parcialmente aberto.

| Ordem | Item | Estado |
|---|---|---|
| 0.1 | **GATE OPERACIONAL:** 0035 na cloud ✅ (confirmada pelo IAGO) · Auth URLs + `UPSTASH_REDIS_*` + DSN Sentry ⏳ **pendente (Dashboard/Vercel)** | Parcial |
| 0.2 | SEC-01: `refine(isSafeHttpUrl)` em `external_url` | ✅ Feito |
| 0.3 | OBS-01/02: `Sentry.captureException` nos 4 error boundaries + helper `reportActionError` nos 9 catches de server actions | ✅ Feito |
| 0.4 | BUG-01: erro do UPDATE em `direct-messages.ts` verificado e reportado (sem bloquear a mensagem já entregue) | ✅ Feito |
| 0.5 | A11y: aria-labels, `focus-within`, touch targets 44px, `htmlFor`, ConfirmDialog no ban, `100dvh` no chat/DM mobile | ✅ Feito |
| ~~0.6~~ | ~~Migration 0036 (search_path)~~ — **CANCELADO: falso positivo**, todas as funções já têm `set search_path = public` | ✅ Verificado, nada a fazer |
| 0.7 | Docs/setup: `.env.example` **reescrito** (o existente ainda ensinava as credenciais do seed demo removido na 0025); PLAYBOOK/PRODUCAO/TYPE_SAFETY atualizados; 7 auditorias antigas marcadas como HISTÓRICO | ✅ Feito |
| 0.8 | E2E: `member-social.spec.ts` (chat, DM, salvos, onboarding, biblioteca deep-link) + `rls.spec.ts` (6 testes adversariais). **Bônus:** 6 specs pré-existentes estavam obsoletos desde a FEATURE 02 e foram corrigidos | ✅ Feito |

**Nenhuma migration foi criada** (0036 cancelada) — o banco não foi tocado.
**Rollback:** todos os itens são revert de commit simples; não há mudança de schema.
**Aceite:** gates verdes (incl. `test:e2e` 53/53) + suíte cobrindo chat/DM/RLS. ✅

## BLOCO 1 — Quick wins (features P, alto valor, baixo risco)

| Ordem | Feature | Esforço | Migrations | Arquivos prováveis | Riscos |
|---|---|---|---|---|---|
| 1.1 | **F-06 Extrato de pontos** ("Meus pontos") | P | nenhuma (RLS own já permite) | página em /profile ou /rewards + query paginada | nenhum relevante |
| 1.2 | **F-04 Continuar assistindo** no dashboard | P | nenhuma | `dashboard/page.tsx` + query lesson_progress | nenhum |
| 1.3 | **F-05 Favoritos na Biblioteca** | P | `0037_saved_resources` (aditiva, clone de saved_posts) | cards da biblioteca + aba em /salvos | baixo |
| 1.4 | **F-03 Melhor resposta** (canais de dúvidas) | P | `0038_comment_solution` (coluna + policy) | comment-list, post-card, action | baixo (policy: autor do post ou mod) |
| 1.5 | **F-08a Export .ics** de eventos | P | nenhuma | route handler + botão no calendário | nenhum |
| 1.6 | BUG-02: paginação de comentários | M | nenhuma | posts.ts + comment-list | baixo |
| 1.7 | PERF quick wins: PERF-02/03 (consolidar awaits) + PERF-05 (next/image) | P/M | nenhuma | courses.ts, members/[userId], 5 componentes | baixo |

**Testes:** cada feature com spec E2E próprio. **Rollback:** migrations aditivas com script de down documentado.

## BLOCO 2 — Features intermediárias

| Ordem | Feature | Esforço | Dependências | Migrations | Riscos |
|---|---|---|---|---|---|
| 2.1 | **F-01 Menções @ + notificação de resposta** | M | notifications (pronta) | nenhuma obrigatória (usa reference_type) | parser de menção; volume de notificações |
| 2.2 | **F-02 Busca global** | M | nenhuma | índices GIN opcionais (aditiva) | performance de ilike sem índice |
| 2.3 | PERF-01: agregação SQL no `enrichPosts` + PERF-07: RPC `get_user_summary` p/ contadores do layout | M | nenhuma | 1 migration de RPCs read-only | regressão de contadores — cobrir com E2E |
| 2.4 | **F-07 Badges** | M | ledger (pronta) | `badges` + `user_badges` (aditivas) | calibragem de regras |
| 2.5 | **F-08b Lembrete de eventos** (notificação on-login, sem cron) | M | F-08a | nenhuma | duplicidade de lembrete (idempotência por reference) |

**Fases por feature:** contrato → migration local → implementação → QA adversarial → aprovação → cloud → deploy (gate padrão em cada uma).

## BLOCO 3 — Estratégicas (avaliar após Bloco 2)

| Feature | Esforço | Observação |
|---|---|---|
| **Planos/área VIP (acesso por produto)** | GG | primeira alavanca de receita; exige pagamentos + gating por RLS; especificar antes (produto define catálogo) |
| **F-10 Analytics admin** | M/G | RPCs de agregação read-only; sem novo serviço |
| **F-09 Salas múltiplas de chat** | M | coluna `room` pronta; decidir moderação antes |
| **Conteúdo agendado (comunicados)** | M/G | precisa gatilho de publicação — avaliar sem cron primeiro |
| Recomendações de conteúdo | — | **Não fazer agora** (sem massa de dados) |

## Limites anti-overcoding reafirmados

Sem evidência de necessidade: microservices, Redis (além do Upstash já usado p/ rate-limit), filas, event sourcing, plugins, CMS, workflow engine, analytics próprio completo, repository pattern, reescritas. Preferir: migrations aditivas, RPCs específicas, RLS existente, componentes pequenos, fases reversíveis.

## Gate padrão de cada fase futura

Estado (CONCLUÍDA / COM RESSALVAS / BLOQUEADA) → arquivos criados/alterados → `pnpm typecheck && pnpm lint && pnpm build && pnpm test:e2e && git diff --check && git status` → banco (migration/rollback/tipos/RLS/cloud) → segurança (UI/action/RLS/bypass/abuso) → performance (queries/N+1/cache) → **aprovação explícita** antes de corrigir, migrar, commitar, aplicar na cloud ou publicar.

---

*Ordem recomendada do ciclo: Bloco 0 → 1.1–1.5 (quick wins de produto) → 2.1 Menções (primeira feature "grande") → reavaliar.*
