> ⚠️ **HISTÓRICO — não usar como estado atual.** Achados deste documento podem já ter sido corrigidos (ex.: award_points, cursos draft, estorno de pontos — resolvidos nas migrations 0010/0031/0032/0035). Estado vigente: docs/AUDIT_POST_RELEASE_*.md (2026-07-08).

# NEW FEATURES — MASTER SUMMARY

**Data:** 2026-07-04 · **Branch:** master · **HEAD:** caaa13e · **Gates baseline:** typecheck ✅ · lint ✅ · build ✅

## Estado atual
Baseline saudável e madura: RLS estabelecida, `points_ledger` idempotente, muito componente/hook reusável (slugify, useImageUpload, RsvpButton, feed). Sem CRÍTICO de segurança do baseline aberto (SEC-01/02/03 fechados em 0009/0010/0025). Rate-limit já migrado pra Upstash (fallback in-memory).

## Principais riscos
| ID | Achado | Severidade | Impacto |
|---|---|---|---|
| **X2** | **`award_points` chamável direto por `authenticated`/`anon` (EXECUTE a PUBLIC), sem guarda interna** | **CRÍTICO — CONFIRMADO** | Auto-premiação de pontos arbitrários; pontos/level/ranking manipuláveis HOJE. **Bloqueia Feature D.** |
| X4 | Soft-delete de post/comment não reverte pontos | ALTO (p/ D) | Deletar conteúdo mantém pontos → fraude |
| X3 | `points_ledger` sem policy UPDATE/DELETE → admin não reverte/ajusta | ALTO (p/ D) | Sem governança de pontos |
| X1 | `/calendar` mostrava eventos encerrados + marcava "em andamento" como encerrado | MÉDIO — **JÁ CORRIGIDO** nesta etapa | UX |

## Ordem recomendada (confirmada por evidência)
1. **Biblioteca 2.0** (P1) — alto valor, baixo risco, muito reuso, sem bloqueadores.
2. **Onboarding/Governança** (P2) — prepara crescimento + pré-requisito de governança de D.
3. **Descoberta/Atividade** (P3) — valor diário; exige QA de performance (trending).
4. **Recompensas Mensais** (P4) — **bloqueada** por X2/X3/X4 + depende de B.

## Dificuldade
A: **P** (rotas [slug] = M) · B: **M** · C: **P/M** · D: **G**.

## Quick wins
- ✅ Micro-fix `/calendar` (feito nesta etapa — commit futuro separado).
- Substituir `select("*")` por colunas nas ~9 admin pages (oportunístico).

## Bloqueadores
- **X2 (award_points)** — correção mínima proposta (revoke public + grant service_role) **antes de qualquer feature**. Não aplicada (aguarda aprovação).
- Feature D depende de X2 + X3 + X4 + governança (Feature B).

## Decisão final
- **Feature A (Biblioteca 2.0): APROVADO PARA REVISÃO DA F1** — F0 detalhado entregue (`FEATURE_A_LIBRARY_2_AUDIT.md`).
- **Ação P0 recomendada (independente de A):** aplicar a correção de `award_points` (migração dedicada mínima) — decisão do IAGO.
- Features B/C/D: planejadas, **não iniciar** (D bloqueada até X2-X4).
