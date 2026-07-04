-- =============================================================================
-- 0029 — get_trending_posts (Feature C F1). "Publicacoes em Alta".
-- hot_score = (likes + 2*reactions + 4*unique_commenters) / (1 + age_days)^1.25
-- Janela p_days (7), minimo 2 interacoes, exclui soft-deleted, limit p_limit (5).
-- SECURITY INVOKER: respeita a RLS do chamador (posts_select_visible etc.) — NAO
-- bypassa visibilidade; o chamador ja enxerga os mesmos posts no feed.
-- =============================================================================

create or replace function public.get_trending_posts(p_days int default 7, p_limit int default 5)
returns table (
  id uuid,
  title text,
  category text,
  author_id uuid,
  created_at timestamptz,
  likes int,
  reactions int,
  unique_commenters int,
  hot_score double precision
)
language sql
stable
security invoker
set search_path = public
as $$
  with recent as (
    select p.id, p.title, p.category, p.author_id, p.created_at
    from posts p
    where p.is_deleted = false
      and p.created_at >= now() - make_interval(days => p_days)
  ),
  agg as (
    select
      r.id, r.title, r.category, r.author_id, r.created_at,
      (select count(*) from post_likes l where l.post_id = r.id) as likes,
      (select count(*) from post_reactions x where x.post_id = r.id) as reactions,
      (select count(distinct c.author_id) from post_comments c
         where c.post_id = r.id and c.is_deleted = false) as unique_commenters
    from recent r
  )
  select
    id, title, category, author_id, created_at,
    likes::int, reactions::int, unique_commenters::int,
    ((likes + 2 * reactions + 4 * unique_commenters)::double precision
      / power(1 + extract(epoch from (now() - created_at)) / 86400.0, 1.25)) as hot_score
  from agg
  where (likes + 2 * reactions + 4 * unique_commenters) >= 2
  order by hot_score desc
  limit p_limit;
$$;

grant execute on function public.get_trending_posts(int, int) to authenticated;

-- Apoio ao scan da janela de 7 dias (posts nao-deletados por recencia).
create index if not exists posts_trending_idx
  on public.posts (created_at desc)
  where is_deleted = false;
