-- =============================================================================
-- 0013 — Comunidade: canais (Fase 3) — CHECK TRANSITÓRIO de posts.category
-- -----------------------------------------------------------------------------
-- Reestruturação da comunidade em grupos + canais (modelagem estática no código).
-- Esta migration é TRANSITÓRIA e RETROCOMPATÍVEL: o CHECK passa a aceitar os
-- slugs ANTIGOS (7 categorias) **e** os slugs NOVOS (15 canais). Nenhum dado é
-- alterado; posts existentes (slugs antigos) continuam válidos — logo pode ser
-- aplicada com segurança ANTES do deploy do código dos canais.
--
-- O CHECK FINAL (só slugs novos) entra na FASE 5, DEPOIS do remap dos dados
-- (0014_migrate_categories_to_channels.sql). A duplicação da allowlist entre a
-- config TypeScript (src/lib/community/structure.ts) e este CHECK é defesa em
-- profundidade intencional.
--
-- Idempotente: pode ser reaplicada com segurança.
-- Backup recomendado antes de aplicar na cloud (é DDL na tabela posts).
-- =============================================================================

alter table public.posts drop constraint if exists posts_category_check;

alter table public.posts add constraint posts_category_check check (
  category in (
    -- LEGADO (transição — serão removidos no CHECK final da Fase 5)
    'geral', 'duvidas', 'apresentacoes', 'resultados', 'projetos', 'avisos', 'suporte',
    -- Boas-vindas
    'comece-por-aqui', 'apresente-se', 'comunicados', 'lives-encontros',
    -- Networking
    'compartilhe-seu-projeto', 'chat-networking', 'dicas-novidades', 'vagas-oportunidades',
    -- Mercado e Negócios
    'marketing-vendas', 'parcerias-colaboracoes', 'servicos-oportunidades', 'projetos-negocios',
    -- Suporte e Construção
    'duvidas-gerais',
    -- Portal Nexus
    'beneficios', 'cupons-descontos'
  )
);
