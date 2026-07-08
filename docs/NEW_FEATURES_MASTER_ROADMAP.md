> ⚠️ **HISTÓRICO — não usar como estado atual.** Achados deste documento podem já ter sido corrigidos (ex.: award_points, cursos draft, estorno de pontos — resolvidos nas migrations 0010/0031/0032/0035). Estado vigente: docs/AUDIT_POST_RELEASE_*.md (2026-07-08).

# NEW FEATURES — MASTER ROADMAP

## Matriz de prioridade
| # | Feature | Valor | Urgência | Dificuldade | Risco | Dependências | Migration | Storage | RLS | Ordem |
|---|---|---|---|---|---|---|---|---|---|---|
| A | Biblioteca 2.0 | Alto | Média | P (rotas M) | Baixo | — | 1 (0026) | reuso/decidir | ajuste leve | **1** |
| B | Onboarding/Gov | Alto | Média | M | Baixo-Méd | — | — | nova | **2** |
| C | Descoberta/Ativ | Médio-Alto | Média | P/M | Médio (perf) | posts/eventos | 0-1 (índice) | — | leitura | **3** |
| D | Recompensas | Alto | Baixa | G | **Alto** (fraude) | X2/X3/X4 + B | 2+ | — | governança | **4** |

**P0 transversal (fora das features):** `0026_secure_award_points.sql` — revoke public + grant service_role (correção de X2). Aplicar antes de D; recomendado ASAP.

## Fases por feature (cada fase: gate + aprovação; nunca auto-avança)

### FEATURE A — Biblioteca 2.0
- **F0** Auditoria + docs (ESTE ENTREGÁVEL — `FEATURE_A_LIBRARY_2_AUDIT.md`).
- **F1** Contrato de dados/URLs: migração `0026` (slug nullable + backfill + colisão determinística + índice unique; cover_url; click_count; RPCs `increment_resource_click`/`increment_app_click`) + schemas Zod + slug no create. **Decidir bucket** (reuso vs `content-covers`).
- **F2** Capas/Storage: `CoverUploader` (reusa useImageUpload) + `updateAppAction` (falta) + editar capa no admin.
- **F3** Páginas `/resources/[slug]` e `/apps/[slug]` (fetch por slug, fallback id) + linkar listagens + render de capa + estado vazio.
- **F4** Contadores atômicos: action de clique intencional (Baixar/Acessar/Abrir) → RPC; falha nunca bloqueia o destino.
- **F5** Paridade apps (mesmos recursos).
- **F6** QA + release.

### FEATURE B — Onboarding/Governança
- F0 Auditoria → F1 conteúdos+contrato (`0027 member_onboarding` + versão dos acordos) → F2 páginas de acordos/diretrizes (estáticas + accordion) → F3 formulário inicial → F4 aceite versionado → F5 primeira experiência em /comece-por-aqui (banner+checklist+CTA + redirect só no 1º acesso) → F6 QA+release.

### FEATURE C — Descoberta/Atividade
- F0 Auditoria → F1 contrato visual + fórmula (validar hot_score no SQL real) → F2 Eventos Futuros (getUpcomingEvents + painel + RSVP) → F3 Publicações em Alta (RPC `get_trending_posts` + cache 60-180s) → F4 responsividade + performance (EXPLAIN → índice só se preciso) → F5 QA+release.

### FEATURE D — Recompensas Mensais
- **F0** Auditoria do ledger + **X2/X3/X4** (secure award_points, revert em soft-delete, `admin_adjust_points`) — pré-requisito.
- F1 regras públicas + antifraude mínimo → F2 ranking mensal (query/RPC + UI 1º/2º/3º) → F3 campanha piloto (seleção/entrega MANUAL) → F4 avaliação → F5 automação futura.

## Gate padrão por fase
Estado (CONCLUÍDA / COM RESSALVAS / BLOQUEADA) · Arquivos (criados/alterados/removidos/migrations) · Gates (`typecheck`/`lint`/`build`/`test:e2e`/`git diff --check`/`status`) · Banco (migration/rollback/backup/tipos regenerados/RLS/cloud) · Segurança (UI/Action/RLS/bypass/abuso) · Performance (queries/N+1/cache/bundle/client components/índices). **Aprovação explícita** para corrigir/commitar/próxima fase/migration/deploy. Migrations só o IAGO aplica na cloud.

## Migrations previstas (nenhuma destrutiva)
`0026_secure_award_points` (P0) · `0026`/`0027` Biblioteca (slug/cover/counter/RPCs) · `0027`/`0028` member_onboarding · (C) índice opcional · (D) revert + admin_adjust_points. *(Numeração final definida na F1 de cada feature.)*

## Rollback
Cada migração aditiva → rollback por `drop column`/`drop function`/`drop policy` (colunas novas nullable; sem perda de dados de produção). Código por `git revert`. Backup antes de qualquer apply na cloud.

## Critérios de aceite (gerais)
Gates verdes · RLS testada por papel · sem N+1 novo · sem `select("*")` novo · métrica nunca bloqueia UX · slug estável · pontos não manipuláveis (pós-X2).

## Estratégia de release
Uma feature por vez, fases pequenas e reversíveis; commit/deploy só sob ordem do IAGO; migração aplicada na cloud pelo IAGO com backup; smoke test pós-deploy.
