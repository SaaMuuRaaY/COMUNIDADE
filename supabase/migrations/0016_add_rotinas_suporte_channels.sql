-- =============================================================================
-- 0016 — Comunidade: canais NOVOS "rotinas" e "suporte-tecnico" (Fase 6.5)
-- -----------------------------------------------------------------------------
-- A Fase 6.5 (unificação da navegação) introduz dois canais que NÃO existiam na
-- config estática nem no CHECK: `rotinas` (announcement, publica moderador) e
-- `suporte-tecnico` (discussion, publica membro). Esta migration apenas ABRE o
-- banco para aceitar posts nesses canais — nada de dados, tabelas ou colunas.
--
-- Aditiva, idempotente e retrocompatível. Roda DEPOIS da 0015 (CHECK final de 15
-- slugs) → resultado: 17 slugs. Espelha src/lib/community/structure.ts (defesa em
-- profundidade). NÃO aplicar até a aprovação/coordenação do release (Fase 7).
-- =============================================================================

-- 1) CHECK — adiciona os 2 slugs novos aos 15 finais da 0015 --------------------
alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts add constraint posts_category_check check (
  category in (
    'comece-por-aqui', 'apresente-se', 'comunicados', 'lives-encontros', 'rotinas',
    'compartilhe-seu-projeto', 'chat-networking', 'dicas-novidades', 'vagas-oportunidades',
    'marketing-vendas', 'parcerias-colaboracoes', 'servicos-oportunidades', 'projetos-negocios',
    'duvidas-gerais', 'suporte-tecnico', 'beneficios', 'cupons-descontos'
  )
);

-- 2) RLS — `rotinas` é canal oficial (publica moderador). `suporte-tecnico` é
--    discussão de membro (default: não restrito, aceita comentário) → sem mudança
--    em channel_requires_admin/channel_allows_comments.
create or replace function public.channel_requires_mod(slug text)
returns boolean language sql immutable as $$
  select slug in ('comunicados', 'lives-encontros', 'comece-por-aqui', 'beneficios', 'cupons-descontos', 'rotinas');
$$;

-- =============================================================================
-- ROLLBACK (se necessário — volta ao estado da 0015):
--   alter table public.posts drop constraint if exists posts_category_check;
--   alter table public.posts add constraint posts_category_check check (category in (
--     'comece-por-aqui','apresente-se','comunicados','lives-encontros',
--     'compartilhe-seu-projeto','chat-networking','dicas-novidades','vagas-oportunidades',
--     'marketing-vendas','parcerias-colaboracoes','servicos-oportunidades','projetos-negocios',
--     'duvidas-gerais','beneficios','cupons-descontos'));
--   create or replace function public.channel_requires_mod(slug text)
--   returns boolean language sql immutable as $$
--     select slug in ('comunicados','lives-encontros','comece-por-aqui','beneficios','cupons-descontos'); $$;
-- =============================================================================
