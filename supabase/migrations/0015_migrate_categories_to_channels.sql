-- =============================================================================
-- 0015 — Comunidade: remap categoria→canal + CHECK FINAL (Fase 5)
-- -----------------------------------------------------------------------------
-- ⚠️ MIGRATION DE RELEASE (fecha o "trem" 3–5). O CHECK FINAL abaixo passa a
-- REJEITAR os slugs antigos. Portanto SÓ aplique na produção JUNTO/DEPOIS do
-- deploy do código dos canais (Fases 3–4). Se aplicada com o código ANTIGO no
-- ar (composer usando 'geral' etc.), a publicação quebraria.
--
-- Preserva 100% dos dados: IDs, autor, datas, comentários, likes, reações,
-- pontos, fixação, mídia. Apenas o slug em posts.category é remapeado.
-- Idempotente. Backup restaurável por post_id (community_migration_backup).
-- Backup do banco recomendado antes de aplicar na cloud.
-- =============================================================================

-- 1) BACKUP restaurável (ANTES do remap) — valor original por post ---------------
create table if not exists public.community_migration_backup (
  post_id uuid primary key references public.posts(id) on delete cascade,
  old_category text not null,
  migrated_at timestamptz not null default now()
);

insert into public.community_migration_backup (post_id, old_category)
select id, category from public.posts
on conflict (post_id) do nothing;

-- 2) REMAP idempotente (só afeta slugs antigos) ---------------------------------
update public.posts set category = 'chat-networking'          where category = 'geral';
update public.posts set category = 'duvidas-gerais'           where category = 'duvidas';
update public.posts set category = 'apresente-se'             where category = 'apresentacoes';
update public.posts set category = 'compartilhe-seu-projeto'  where category = 'resultados';
update public.posts set category = 'projetos-negocios'        where category = 'projetos';
update public.posts set category = 'comunicados'              where category = 'avisos';
update public.posts set category = 'duvidas-gerais'           where category = 'suporte';

-- 3) GUARD: nenhum slug antigo pode restar (aborta a migration se restar) --------
do $$
declare n int;
begin
  select count(*) into n from public.posts
  where category in ('geral','duvidas','apresentacoes','resultados','projetos','avisos','suporte');
  if n > 0 then
    raise exception 'Remap incompleto: % post(s) ainda com slug antigo', n;
  end if;
end $$;

-- 4) CHECK FINAL — só os 15 canais novos ----------------------------------------
alter table public.posts drop constraint if exists posts_category_check;
alter table public.posts add constraint posts_category_check check (
  category in (
    'comece-por-aqui', 'apresente-se', 'comunicados', 'lives-encontros',
    'compartilhe-seu-projeto', 'chat-networking', 'dicas-novidades', 'vagas-oportunidades',
    'marketing-vendas', 'parcerias-colaboracoes', 'servicos-oportunidades', 'projetos-negocios',
    'duvidas-gerais', 'beneficios', 'cupons-descontos'
  )
);

-- =============================================================================
-- ROLLBACK (se necessário — restaura o valor original por post):
--   alter table public.posts drop constraint if exists posts_category_check;
--   alter table public.posts add constraint posts_category_check check (category in (
--     'geral','duvidas','apresentacoes','resultados','projetos','avisos','suporte',
--     'comece-por-aqui','apresente-se','comunicados','lives-encontros',
--     'compartilhe-seu-projeto','chat-networking','dicas-novidades','vagas-oportunidades',
--     'marketing-vendas','parcerias-colaboracoes','servicos-oportunidades','projetos-negocios',
--     'duvidas-gerais','beneficios','cupons-descontos'));
--   update public.posts p set category = b.old_category
--     from public.community_migration_backup b where b.post_id = p.id;
-- =============================================================================
