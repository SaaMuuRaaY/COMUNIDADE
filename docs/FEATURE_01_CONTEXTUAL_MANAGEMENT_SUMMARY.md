# FEATURE 01 — Gestão Contextual por Unidade · Sumário Executivo

**O quê:** owner/admin (e membros/moderadores, onde permitido) gerenciam conteúdo **dentro da
própria unidade** (canal ou módulo) — criar/editar/fixar/mover/excluir — sem entrar no Painel
Admin para o dia a dia. O Painel Admin permanece para visão global/auditoria/massa.

**Baseline:** `master` limpo · typecheck/lint/build **0** · RLS por canal validada. Score sólido.

## Achados-chave
- **RLS sólida (3 camadas)** — membro não fura publicar/mover para canal restrito.
- **F01-01 (P1):** membro publica em ~8 canais; desejado = **5** → **D1** restringe
  marketing-vendas, duvidas-gerais, suporte-tecnico (member→moderator + migration **0017**).
- **F01-02 (P1):** moderador cria módulos hoje; desejado = **admin-only** → **D2** alinha
  createCourse/Resource/Event (createApp já é admin).
- **F01-03 (P1):** gestão contextual não existe (CTAs/forms nas unidades) — é a feature.
- **F01-04/05 (P2):** "mover de canal" falta na UI (backend+RLS prontos); composer não configurável.
- **Tipagem (P2/P3):** `PostCategory` obsoleto (`db.ts`), `ProfileLike.role: string`, casts em admin.

## Decisões travadas (IAGO)
- **D1 = restringir membro a 5 canais** ✅
- **D2 = módulos admin-only** ✅

## Reuso (baixo overcoding)
1 composer configurável p/ 13 canais · `updatePostAction`/`pinPostAction`/`deletePostAction`
prontos · `ResourceForm` reutilizável, `App/EventComposer` extraíveis · `policies.ts` + RLS 0014/0016.

## Roadmap
F1 contrato · F2 canais (composer+CTA+D1+0017) · F3 moderação (mover) · F4 módulos (D2) ·
F5 Chat Network (doc) · F6 QA. Cada fase com gate + aprovação.

## Migrations
**0017** (certa, F2) · **0018?** (RLS módulo p/ D2, se necessário).

## Decisão
**APROVADO PARA INICIAR A F1** — complexidade média, sem bloqueios.
