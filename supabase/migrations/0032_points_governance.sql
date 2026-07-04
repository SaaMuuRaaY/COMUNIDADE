-- =============================================================================
-- 0032 — Governanca de pontos (Feature D F1). Pre-requisitos p/ premiar:
--  X3: admin_adjust_points(user, delta, reason) — via SEGURA p/ admin creditar/
--      estornar pontos (SECURITY DEFINER + guard is_admin(); grava no ledger
--      auditavel com reason + atualiza o cache profiles.points/level).
--  X4: revert de pontos no SOFT-DELETE de post/comment — apaga do points_ledger
--      as entradas daquele conteudo (reference_id = id) e decrementa profiles.
--      Fecha o vetor: cria conteudo -> ganha pontos -> deleta -> mantem pontos.
-- =============================================================================

-- Coluna de auditoria (motivo) — usada por ajustes manuais do admin.
alter table public.points_ledger add column if not exists reason text;

-- A CHECK original (0005) so listava as 5 acoes automaticas; libera a nova acao
-- de ajuste manual do admin ('admin_adjustment').
alter table public.points_ledger drop constraint if exists points_ledger_action_check;
alter table public.points_ledger add constraint points_ledger_action_check
  check (action in (
    'post_created','comment_created','like_received','lesson_completed',
    'event_attended','admin_adjustment'
  ));

-- ----------------------------------------------------------------------------
-- X3 — admin_adjust_points: credita/estorna pontos manualmente (auditavel).
-- reference_id unico por ajuste (gen_random_uuid) evita colisao com a unique
-- constraint idempotente do ledger. Guarda is_admin() dentro (auth.uid() do
-- chamador e preservado mesmo em SECURITY DEFINER).
-- ----------------------------------------------------------------------------
create or replace function public.admin_adjust_points(p_user uuid, p_delta integer, p_reason text)
returns void
language plpgsql
security definer
set search_path = public
as $$
begin
  if not public.is_admin() then
    raise exception 'apenas admin pode ajustar pontos';
  end if;
  if p_reason is null or length(btrim(p_reason)) = 0 then
    raise exception 'motivo (reason) obrigatorio';
  end if;

  insert into public.points_ledger (user_id, action, points, reference_type, reference_id, reason)
  values (p_user, 'admin_adjustment', p_delta, 'admin', gen_random_uuid(), p_reason);

  update public.profiles
     set points = greatest(0, points + p_delta),
         level  = public.recalc_level(greatest(0, points + p_delta)),
         updated_at = now()
   where id = p_user;
end;
$$;

revoke execute on function public.admin_adjust_points(uuid, integer, text) from public;
grant  execute on function public.admin_adjust_points(uuid, integer, text) to authenticated;

-- ----------------------------------------------------------------------------
-- X4 — revert no soft-delete. Trigger generico: quando is_deleted vira true,
-- apaga do ledger as entradas com reference_id = id do conteudo (post_created +
-- like_received p/ posts; comment_created p/ comments) e decrementa o cache dos
-- usuarios afetados. reference_id (uuid) e global -> nao colide entre post/comment.
-- ----------------------------------------------------------------------------
create or replace function public.revert_points_on_content_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.is_deleted and not coalesce(old.is_deleted, false) then
    with removed as (
      delete from public.points_ledger
       where reference_id = new.id
      returning user_id, points
    ),
    agg as (
      select user_id, sum(points) as pts from removed group by user_id
    )
    update public.profiles p
       set points = greatest(0, (p.points - agg.pts)::int),
           level  = public.recalc_level(greatest(0, (p.points - agg.pts)::int)),
           updated_at = now()
      from agg
     where p.id = agg.user_id;
  end if;
  return new;
end;
$$;

drop trigger if exists posts_revert_points on public.posts;
create trigger posts_revert_points
  after update of is_deleted on public.posts
  for each row execute function public.revert_points_on_content_delete();

drop trigger if exists comments_revert_points on public.post_comments;
create trigger comments_revert_points
  after update of is_deleted on public.post_comments
  for each row execute function public.revert_points_on_content_delete();
