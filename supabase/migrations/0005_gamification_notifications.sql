-- =============================================================================
-- 0005 — Gamificação (points_ledger, award_points) + Notifications + Settings
-- =============================================================================

create table public.points_ledger (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  action text not null check (
    action in ('post_created','comment_created','like_received','lesson_completed','event_attended')
  ),
  points integer not null,
  reference_type text,
  reference_id uuid,
  created_at timestamptz not null default now(),
  unique(user_id, action, reference_type, reference_id)
);

create index points_ledger_user_idx on public.points_ledger(user_id, created_at desc);

-- -----------------------------------------------------------------------------
-- recalc_level — recalcula nível baseado em pontos
-- -----------------------------------------------------------------------------
create or replace function public.recalc_level(p_points integer)
returns integer
language sql
immutable
as $$
  select case
    when p_points >= 1500 then 5
    when p_points >= 700  then 4
    when p_points >= 300  then 3
    when p_points >= 100  then 2
    else 1
  end;
$$;

-- -----------------------------------------------------------------------------
-- award_points — função idempotente para premiar pontuação
-- -----------------------------------------------------------------------------
create or replace function public.award_points(
  p_user uuid,
  p_action text,
  p_points integer,
  p_ref_type text default null,
  p_ref_id uuid default null
)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_new_total integer;
begin
  insert into public.points_ledger (user_id, action, points, reference_type, reference_id)
  values (p_user, p_action, p_points, p_ref_type, p_ref_id)
  on conflict (user_id, action, reference_type, reference_id) do nothing;

  if not found then
    return;
  end if;

  update public.profiles
     set points = points + p_points,
         level  = public.recalc_level(points + p_points),
         updated_at = now()
   where id = p_user
  returning points into v_new_total;
end;
$$;

-- -----------------------------------------------------------------------------
-- Trigger: like recebido → pontos para o autor do post
-- -----------------------------------------------------------------------------
create or replace function public.handle_like_award()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
begin
  select author_id into v_author from public.posts where id = new.post_id;
  if v_author is null or v_author = new.user_id then
    return new;
  end if;
  perform public.award_points(v_author, 'like_received', 2, 'post', new.post_id::uuid);
  return new;
end;
$$;

create trigger post_likes_award
  after insert on public.post_likes
  for each row execute function public.handle_like_award();

-- -----------------------------------------------------------------------------
create table public.notifications (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  title text not null,
  body text,
  type text not null default 'system',
  read_at timestamptz,
  created_at timestamptz not null default now()
);

create index notifications_user_idx on public.notifications(user_id, created_at desc);
create index notifications_unread_idx on public.notifications(user_id) where read_at is null;

-- -----------------------------------------------------------------------------
create table public.settings (
  key text primary key,
  value jsonb not null,
  updated_at timestamptz not null default now()
);
