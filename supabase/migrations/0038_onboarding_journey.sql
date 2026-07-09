-- =============================================================================
-- 0038 — FEATURE: Onboarding Journey 2.0
--
-- Regra central: concluir o FORMULARIO (completed_at) libera publicar SO em
-- /apresente-se. Publicar nos demais canais so apos a 1a apresentacao registrada
-- (introduction_completed_at). Usuarios ANTIGOS ficam dispensados via
-- grandfathered_at (sem afirmar falsamente que fizeram formulario/video/apresentacao).
--
-- Aditiva/idempotente (colunas, funcoes, CHECK, policy). O BACKFILL de grandfather
-- e uma operacao de dados de LANCAMENTO (roda 1x no apply desta migration).
-- NAO aplicar na cloud sem aprovacao.
-- =============================================================================

-- 1. Colunas de progresso da jornada (aditivas). RLS 0028 (own) ja cobre. --------
alter table public.member_onboarding
  add column if not exists welcome_tour_completed_at  timestamptz,
  add column if not exists welcome_video_completed_at timestamptz,
  -- referencia APENAS ao post (on delete set null); a PROVA e o timestamp abaixo.
  add column if not exists introduction_post_id       uuid references public.posts(id) on delete set null,
  -- prova real da 1a apresentacao — PERSISTE mesmo se o post for excluido/moderado.
  add column if not exists introduction_completed_at  timestamptz,
  add column if not exists journey_completed_at        timestamptz,
  add column if not exists grandfathered_at            timestamptz,
  add column if not exists tour_version                text;

-- 2. Acoes de pontos da jornada no CHECK do ledger ------------------------------
alter table public.points_ledger drop constraint if exists points_ledger_action_check;
alter table public.points_ledger add constraint points_ledger_action_check
  check (action in (
    'post_created','comment_created','like_received','lesson_completed',
    'event_attended','admin_adjustment',
    'signup','onboarding_completed','first_introduction'
  ));

-- 3. handle_new_user: concede 10 pontos de CADASTRO (perfil + ledger) ------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url, points, level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6)),
    new.raw_user_meta_data->>'avatar_url',
    10,
    public.recalc_level(10)
  );
  insert into public.points_ledger (user_id, action, points, reference_type, reference_id)
  values (new.id, 'signup', 10, 'signup', new.id)
  on conflict (user_id, action, reference_type, reference_id) do nothing;
  return new;
end;
$$;

-- 4. Gate de publicacao por estado da jornada (SECURITY DEFINER, padrao is_admin) -
-- Le apenas a propria linha (user_id = auth.uid()).
create or replace function public.onboarding_allows_post(p_category text)
returns boolean
language sql
security definer
stable
set search_path = public
as $$
  select exists (
    select 1 from public.member_onboarding mo
    where mo.user_id = auth.uid()
      and (
        mo.grandfathered_at is not null
        or mo.introduction_completed_at is not null
        or (mo.completed_at is not null and p_category = 'apresente-se')
      )
  );
$$;
revoke all on function public.onboarding_allows_post(text) from public;
grant execute on function public.onboarding_allows_post(text) to authenticated;

-- 5. posts INSERT: adiciona o gate de onboarding a policy vigente (0014) ----------
-- Backstop de RLS contra INSERT direto via PostgREST (alem de UI + Server Action).
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_not_banned()
    and (not public.channel_requires_mod(category) or public.is_moderator())
    and (not public.channel_requires_admin(category) or public.is_admin())
    and public.onboarding_allows_post(category)
  );

-- 6. BACKFILL grandfather (LANCAMENTO — roda 1x) --------------------------------
-- Todos os membros ATUAIS ficam dispensados da nova jornada (inclui quem fez o
-- onboarding ANTIGO: tem completed_at mas nao introduction_completed_at, e sem
-- grandfather seria travado nos demais canais). Sem pontos de signup retroativos.
insert into public.member_onboarding (user_id, grandfathered_at, created_at, updated_at)
select p.id, now(), now(), now()
from public.profiles p
where not exists (select 1 from public.member_onboarding mo where mo.user_id = p.id);

update public.member_onboarding
   set grandfathered_at = now(), updated_at = now()
 where grandfathered_at is null
   and introduction_completed_at is null;

-- =============================================================================
-- ROLLBACK:
--   drop policy if exists "posts_insert_own" on public.posts;
--   create policy "posts_insert_own" on public.posts for insert to authenticated
--     with check (author_id = auth.uid() and public.is_not_banned()
--       and (not public.channel_requires_mod(category) or public.is_moderator())
--       and (not public.channel_requires_admin(category) or public.is_admin()));
--   drop function if exists public.onboarding_allows_post(text);
--   alter table public.points_ledger drop constraint if exists points_ledger_action_check;
--   alter table public.points_ledger add constraint points_ledger_action_check
--     check (action in ('post_created','comment_created','like_received',
--       'lesson_completed','event_attended','admin_adjustment'));
--   -- handle_new_user: restaurar versao 0001 (sem pontos).
--   alter table public.member_onboarding
--     drop column if exists welcome_tour_completed_at, drop column if exists welcome_video_completed_at,
--     drop column if exists introduction_post_id, drop column if exists introduction_completed_at,
--     drop column if exists journey_completed_at, drop column if exists grandfathered_at,
--     drop column if exists tour_version;
-- =============================================================================
