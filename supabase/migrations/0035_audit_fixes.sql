-- =============================================================================
-- 0035 — Correcoes da auditoria tecnica pos roadmap-mestre:
--  (SEC) community_migration_backup (0015) ficou SEM RLS: qualquer usuario
--        autenticado lia post_id/categoria historica via PostgREST. Habilita RLS
--        e restringe leitura a admin (a tabela e so backup interno).
--  (X4 extensao) pontos de lesson_completed (15) e event_attended (20) NAO eram
--        estornados no delete — o revert do 0032 so cobria post/comment (que sao
--        soft-delete). lessons/events sao HARD-delete; trigger AFTER DELETE apaga
--        as entradas do ledger daquele conteudo (reference_id=id) + decrementa o
--        cache em profiles. Fecha os pontos orfaos ao deletar aula/evento.
-- =============================================================================

-- (SEC) RLS na tabela de backup da migracao 0015 ------------------------------
alter table public.community_migration_backup enable row level security;

drop policy if exists "community_migration_backup_admin_read" on public.community_migration_backup;
create policy "community_migration_backup_admin_read"
  on public.community_migration_backup for select to authenticated
  using (public.is_admin());

-- (X4) estorno de pontos no HARD-DELETE de event/lesson -----------------------
-- Analogo ao revert_points_on_content_delete (0032, soft-delete de post/comment),
-- mas para DELETE fisico: usa old.id. reference_id (uuid) e global, nao colide.
create or replace function public.revert_points_on_hard_delete()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  with removed as (
    delete from public.points_ledger
     where reference_id = old.id
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
  return old;
end;
$$;

drop trigger if exists events_revert_points on public.events;
create trigger events_revert_points
  after delete on public.events
  for each row execute function public.revert_points_on_hard_delete();

drop trigger if exists lessons_revert_points on public.lessons;
create trigger lessons_revert_points
  after delete on public.lessons
  for each row execute function public.revert_points_on_hard_delete();
