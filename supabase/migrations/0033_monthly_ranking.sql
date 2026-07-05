-- =============================================================================
-- 0033 — Ranking mensal (Feature D F2). get_monthly_ranking(mes, limit) agrega o
-- points_ledger por usuario dentro do mes (date_trunc), source-of-truth do mes
-- (NAO profiles.points, que e all-time). SECURITY DEFINER: agrega TODOS os
-- usuarios (ranking publico, como o /leaderboard all-time ja e); a RLS own-or-mod
-- do ledger nao permitiria isso via INVOKER. Exclui banidos e saldo <= 0.
-- =============================================================================

create or replace function public.get_monthly_ranking(p_month date default null, p_limit int default 50)
returns table (
  user_id uuid,
  full_name text,
  username text,
  avatar_url text,
  level int,
  monthly_points bigint
)
language sql
stable
security definer
set search_path = public
as $$
  select
    pl.user_id,
    pr.full_name,
    pr.username,
    pr.avatar_url,
    pr.level,
    sum(pl.points) as monthly_points
  from points_ledger pl
  join profiles pr on pr.id = pl.user_id
  where pl.created_at >= date_trunc('month', coalesce(p_month, now()::date))
    and pl.created_at <  date_trunc('month', coalesce(p_month, now()::date)) + interval '1 month'
    and pr.is_banned = false
  group by pl.user_id, pr.full_name, pr.username, pr.avatar_url, pr.level
  having sum(pl.points) > 0
  order by monthly_points desc, pr.full_name asc
  limit least(greatest(p_limit, 1), 200);
$$;

grant execute on function public.get_monthly_ranking(date, int) to authenticated;

-- Apoio ao scan por periodo (o indice existente e (user_id, created_at) e nao
-- ajuda um range so por created_at across-users).
create index if not exists points_ledger_created_idx on public.points_ledger (created_at);
