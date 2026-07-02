-- =============================================================================
-- 0017 — FEATURE 01 / D1: restringe publicação de membro em 3 canais
-- -----------------------------------------------------------------------------
-- Decisão de produto (D1): membro publica só em 5 unidades. Os canais de
-- discussão `marketing-vendas`, `duvidas-gerais` e `suporte-tecnico` passam a
-- exigir MODERADOR para publicar (antes: member). Espelha src/lib/community/
-- structure.ts (publish: member→moderator nesses 3).
--
-- Reforço no BANCO: adiciona os 3 slugs a channel_requires_mod → a RLS de INSERT
-- (0014 posts_insert_own) passa a exigir is_moderator() para eles. COMENTÁRIOS
-- seguem permitidos a membros (comments=true; não entram em channel_allows_comments).
-- Aditiva, idempotente. Não altera dados. NÃO aplicar na cloud sem aprovação.
-- =============================================================================

create or replace function public.channel_requires_mod(slug text)
returns boolean language sql immutable as $$
  select slug in (
    'comunicados', 'lives-encontros', 'comece-por-aqui', 'beneficios', 'cupons-descontos', 'rotinas',
    'marketing-vendas', 'duvidas-gerais', 'suporte-tecnico'
  );
$$;

-- =============================================================================
-- ROLLBACK (volta ao estado da 0016):
--   create or replace function public.channel_requires_mod(slug text)
--   returns boolean language sql immutable as $$
--     select slug in ('comunicados','lives-encontros','comece-por-aqui','beneficios','cupons-descontos','rotinas'); $$;
-- =============================================================================
