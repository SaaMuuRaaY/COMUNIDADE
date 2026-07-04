-- =============================================================================
-- 0030 — get_trending_posts: robustez (QA F5). Recria a funcao da 0029 com:
--  - and p.created_at <= now(): exclui posts com data FUTURA (clock skew/edicao)
--    que quebrariam power(base_negativa/zero, 1.25) e derrubavam a RPC inteira.
--  - greatest(p_days,1) e least(greatest(p_limit,1),100): clampa parametros — a
--    RPC e authenticated-callable direto (evita janela invertida e limit gigante).
-- Assinatura e retorno IDENTICOS a 0029 (nenhuma mudanca de tipos gerados).
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
      and p.created_at <= now()
      and p.created_at >= now() - make_interval(days => greatest(p_days, 1))
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
  limit least(greatest(p_limit, 1), 100);
$$;

grant execute on function public.get_trending_posts(int, int) to authenticated;
