# FEATURE 01 — Gestão Contextual por Unidade · Release

Documento de release da FEATURE 01. Fases F0→F6 concluídas. QA multi-camada limpo
(0 defeitos confirmados). **SQL aplicado por último** (0017/0018 na cloud no passo de release).

## O que entrou

- **F2 — Canais:** composer configurável (`actionLabel`/`placeholder`/`guidance` em
  `post-composer.tsx`), CTA/guidance por canal (`CHANNEL_COMPOSER`/`getChannelComposer` em
  `structure.ts`), nota "Apenas a equipe publica neste canal" quando sem permissão.
- **D1 — Publicação de membro restrita a 5 canais:** `marketing-vendas`, `duvidas-gerais`,
  `suporte-tecnico` mudaram `publish: member→moderator` + `channel_requires_mod` (migration 0017).
- **F3 — Moderação contextual:** "mover de canal" no editor do post (`post-card.tsx`), só mod/admin,
  reusa `updatePostAction`; prop `role` threaded (feed + `/post/[id]`); RLS UPDATE endurecida (0018).
- **F4 — Módulos:** D2 (criação/edição/exclusão de cursos/recursos/eventos → **admin**; Apps já era)
  nas Server Actions + RLS 0018; CTAs admin-only nas páginas `/resources`, `/apps`, `/calendar`
  (dialogs reusando os forms do `/admin`) e `/courses` (link p/ `/admin/courses/new`).
- **F5 — Chat Network:** label corrigido para "Chat Network" (slug/rota estáveis); backlog realtime
  → FEATURE 02.

## Matriz de permissões final

| Papel | Pub. 5 canais | Pub. 3 restritos | Pub. admin-only | Criar módulos | Mover | Fixar | Marcar/RSVP/Comentar |
|---|:---:|:---:|:---:|:---:|:---:|:---:|:---:|
| Owner/Admin | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ | ✓ |
| Moderador | ✓ | ✓ | ✗ | ✗ | ✓ | ✓ | ✓ |
| Membro | ✓ | ✗ | ✗ | ✗ | ✗ | ✗ | ✓ |
| Banido | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ | ✗ |

5 canais de membro: apresente-se, compartilhe-seu-projeto, chat-networking, vagas-oportunidades,
parcerias-colaboracoes. Defesa em **3 camadas** (UI oculta → Server Action valida → RLS `WITH CHECK`).

## Migrations (aplicar por ÚLTIMO, na ordem)

| # | Conteúdo | Reversível por |
|---|---|---|
| `0017_restrict_member_publish_channels` | `channel_requires_mod` += marketing-vendas, duvidas-gerais, suporte-tecnico (9 slugs) | recriar função com 6 slugs |
| `0018_modules_admin_only_and_move_admin_guard` | `courses/modules/lessons/resources/events_mod_write`→`*_admin_write` (is_admin); `posts_update_own` += guarda `channel_requires_admin` | recriar policies `is_moderator` + posts_update_own sem a guarda |

Aditivas, idempotentes, **não alteram dados**. Validadas no stack local (Docker + remap de portas):
`channel_requires_mod` retorna `t` para os 3 canais; policies de módulo `*_admin_write`;
`posts_update_own` com `channel_requires_admin`. `pnpm db:types` sem diff.

## QA — F6 (multi-camada, adversarial)

Review Haiku em 4 camadas — **0 defeitos confirmados**:
- Permissões D1/D2 (matriz por papel; 3 camadas UI/Action/RLS). ✅
- Segurança das CTAs (admin-only server-gated) + "mover de canal" (mod/admin; alvos filtrados). ✅
- Fronteiras RSC/client + props threaded + sem regressão. ✅
- Corretude das migrations 0017/0018 (idempotência, rollback, sem alterar dados). ✅

Gates estáticos: typecheck 0 · lint 0 · build 0 · diff-check limpo.
**Runtime QA (navegador):** owner/admin/mod/membro/banido + mobile — a executar no release.

## Runbook de release

1. **Commit** da UI da F4 + F5 (código; migrations 0017/0018 já commitadas).
2. **Deploy** do código (Vercel).
3. **Aplicar SQL por último**, na ordem, no SQL Editor do Supabase (backup antes):
   `0017` → `0018`. Conferir: `channel_requires_mod('marketing-vendas')=t`; policies `*_admin_write`;
   `posts_update_own` com a guarda admin.
4. **Smoke test** por papel (publicar em canal permitido/barrado; mover post; criar módulo como
   admin; membro sem CTA de criação; mod sem criar módulo).

## Rollback

Código: `git revert`. Migrations: recriar policies/função anteriores (idempotente). Sem dados
alterados.

## Backlog

- FEATURE 02 — Chat Network em tempo real (Supabase Realtime, presença, moderação).
- Reabrir (se desejado) publicação de membro em Marketing/Dúvidas/Suporte (decisão futura).
- Tidy-ups: `PostCategory` obsoleto em `db.ts`, casts em `admin/apps/page.tsx`, `ProfileLike.role`.
- Extrair forms de módulo para `components/*` (opcional; hoje compartilhados a partir de `/admin`).
