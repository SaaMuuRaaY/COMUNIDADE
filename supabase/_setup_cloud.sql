-- =============================================================================
-- ⚠️ LEGADO / SNAPSHOT HISTÓRICO — NÃO USAR PARA PROVISIONAR (marcado 2026-06-30)
-- -----------------------------------------------------------------------------
-- Este arquivo é um snapshot CONCATENADO e DEFASADO: cobre apenas 0001–0007.
-- NÃO contém: 0008 (triggers de notificação), 0009 (is_owner + RPCs admin +
-- blindagem de colunas sensíveis / SEC-01), 0010 (RLS de cursos draft / SEC-03),
-- 0011 (social_links) nem 0012 (post_reactions). Provisionar a cloud por ele
-- deixaria o banco INSEGURO e o app quebraria em runtime.
--
-- FONTE ÚNICA DE VERDADE DO SCHEMA = supabase/migrations/ (0001..0012).
-- Provisionar/atualizar com:  npx supabase db push
--   (ou aplicar as migrations 0001..0012 EM ORDEM no SQL Editor).
-- NÃO sincronizar este arquivo à mão. Mantido só como referência histórica.
-- =============================================================================

-- =============================================================================
-- 0001 — Profiles + Communities + Members
-- =============================================================================

create extension if not exists "pgcrypto";

-- -----------------------------------------------------------------------------
-- profiles
-- -----------------------------------------------------------------------------
create table public.profiles (
  id uuid primary key references auth.users(id) on delete cascade,
  full_name text,
  username text unique,
  avatar_url text,
  bio text,
  role text not null default 'member' check (role in ('admin','moderator','member')),
  points integer not null default 0,
  level integer not null default 1,
  is_banned boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index profiles_role_idx on public.profiles(role);
create index profiles_points_idx on public.profiles(points desc);

-- -----------------------------------------------------------------------------
-- communities
-- -----------------------------------------------------------------------------
create table public.communities (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  slug text not null unique,
  description text,
  logo_url text,
  primary_color text default '#0a0a0a',
  visibility text not null default 'private' check (visibility in ('public','private')),
  created_at timestamptz not null default now()
);

-- -----------------------------------------------------------------------------
-- community_members
-- -----------------------------------------------------------------------------
create table public.community_members (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  role text not null default 'member' check (role in ('admin','moderator','member')),
  joined_at timestamptz not null default now(),
  unique(community_id, user_id)
);

create index community_members_user_idx on public.community_members(user_id);
create index community_members_community_idx on public.community_members(community_id);

-- -----------------------------------------------------------------------------
-- handle_new_user — cria profile automático ao registrar
-- -----------------------------------------------------------------------------
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6)),
    new.raw_user_meta_data->>'avatar_url'
  );
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function public.handle_new_user();

-- -----------------------------------------------------------------------------
-- updated_at trigger genérico
-- -----------------------------------------------------------------------------
create or replace function public.touch_updated_at()
returns trigger
language plpgsql
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

create trigger profiles_updated_at
  before update on public.profiles
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
-- helpers de role (referenciados em policies)
-- -----------------------------------------------------------------------------
create or replace function public.current_role()
returns text
language sql
stable
security definer
set search_path = public
as $$
  select role from public.profiles where id = auth.uid();
$$;

create or replace function public.is_admin()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role = 'admin' and is_banned = false
  );
$$;

create or replace function public.is_moderator()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and role in ('admin','moderator') and is_banned = false
  );
$$;

create or replace function public.is_not_banned()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and is_banned = false
  );
$$;
-- =============================================================================
-- 0002 — Posts + Comments + Likes
-- =============================================================================

create table public.posts (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  category text not null default 'geral' check (
    category in ('geral','duvidas','apresentacoes','resultados','projetos','avisos','suporte')
  ),
  title text,
  body text not null,
  media_url text,
  media_type text,
  attachment_url text,
  is_pinned boolean not null default false,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index posts_community_idx on public.posts(community_id, created_at desc);
create index posts_author_idx on public.posts(author_id);
create index posts_category_idx on public.posts(category);

create trigger posts_updated_at
  before update on public.posts
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
create table public.post_comments (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  parent_id uuid references public.post_comments(id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index post_comments_post_idx on public.post_comments(post_id, created_at);
create index post_comments_parent_idx on public.post_comments(parent_id);

-- -----------------------------------------------------------------------------
create table public.post_likes (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  unique(post_id, user_id)
);

create index post_likes_user_idx on public.post_likes(user_id);
-- =============================================================================
-- 0003 — Cursos, Módulos, Aulas e Progresso
-- =============================================================================

create table public.courses (
  id uuid primary key default gen_random_uuid(),
  community_id uuid not null references public.communities(id) on delete cascade,
  title text not null,
  slug text not null,
  description text,
  cover_url text,
  status text not null default 'draft' check (status in ('draft','published')),
  order_index integer not null default 0,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  unique(community_id, slug)
);

create index courses_community_idx on public.courses(community_id, order_index);
create index courses_status_idx on public.courses(status);

create trigger courses_updated_at
  before update on public.courses
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
create table public.course_modules (
  id uuid primary key default gen_random_uuid(),
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  order_index integer not null default 0,
  created_at timestamptz not null default now()
);

create index course_modules_course_idx on public.course_modules(course_id, order_index);

-- -----------------------------------------------------------------------------
create table public.lessons (
  id uuid primary key default gen_random_uuid(),
  module_id uuid not null references public.course_modules(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  title text not null,
  description text,
  video_url text,
  video_storage_path text,
  content text,
  attachment_url text,
  order_index integer not null default 0,
  duration_seconds integer not null default 0,
  is_free boolean not null default false,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index lessons_module_idx on public.lessons(module_id, order_index);
create index lessons_course_idx on public.lessons(course_id, order_index);

create trigger lessons_updated_at
  before update on public.lessons
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
create table public.lesson_progress (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  course_id uuid not null references public.courses(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  completed boolean not null default false,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  unique(lesson_id, user_id)
);

create index lesson_progress_user_idx on public.lesson_progress(user_id);
create index lesson_progress_course_idx on public.lesson_progress(course_id);

-- -----------------------------------------------------------------------------
create table public.lesson_comments (
  id uuid primary key default gen_random_uuid(),
  lesson_id uuid not null references public.lessons(id) on delete cascade,
  author_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index lesson_comments_lesson_idx on public.lesson_comments(lesson_id, created_at);
-- =============================================================================
-- 0004 — Recursos, Apps e Eventos
-- =============================================================================

create table public.resources (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  category text not null default 'apostilas' check (
    category in ('apostilas','templates','planilhas','codigos','checklists','ferramentas')
  ),
  file_url text,
  file_storage_path text,
  file_type text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index resources_category_idx on public.resources(category);
create index resources_created_at_idx on public.resources(created_at desc);

-- -----------------------------------------------------------------------------
create table public.apps (
  id uuid primary key default gen_random_uuid(),
  name text not null,
  description text,
  category text not null default 'ferramentas-internas' check (
    category in ('ia','programacao','automacao','produtividade','marketing','comunidade','ferramentas-internas')
  ),
  type text not null default 'link' check (type in ('link','embed','file','internal')),
  status text not null default 'active' check (status in ('active','coming-soon','beta')),
  url text,
  embed_url text,
  file_url text,
  icon_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create index apps_category_idx on public.apps(category);
create index apps_status_idx on public.apps(status);

create trigger apps_updated_at
  before update on public.apps
  for each row execute function public.touch_updated_at();

-- -----------------------------------------------------------------------------
create table public.events (
  id uuid primary key default gen_random_uuid(),
  title text not null,
  description text,
  event_type text not null default 'live' check (
    event_type in ('live','mentoria','aula','desafio','reuniao')
  ),
  starts_at timestamptz not null,
  ends_at timestamptz,
  external_url text,
  created_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now()
);

create index events_starts_at_idx on public.events(starts_at);

-- -----------------------------------------------------------------------------
create table public.event_attendees (
  id uuid primary key default gen_random_uuid(),
  event_id uuid not null references public.events(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'going' check (status in ('going','maybe','declined')),
  created_at timestamptz not null default now(),
  unique(event_id, user_id)
);

create index event_attendees_user_idx on public.event_attendees(user_id);
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
-- =============================================================================
-- 0006 — Row Level Security (RLS)
-- =============================================================================

-- profiles -------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- communities ----------------------------------------------------------------
alter table public.communities enable row level security;

create policy "communities_select_all"
  on public.communities for select
  to authenticated
  using (true);

create policy "communities_admin_write"
  on public.communities for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- community_members ----------------------------------------------------------
alter table public.community_members enable row level security;

create policy "community_members_select_all"
  on public.community_members for select
  to authenticated
  using (true);

create policy "community_members_insert_self"
  on public.community_members for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "community_members_admin_all"
  on public.community_members for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- posts ----------------------------------------------------------------------
alter table public.posts enable row level security;

create policy "posts_select_visible"
  on public.posts for select
  to authenticated
  using (is_deleted = false or public.is_moderator());

create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_not_banned());

create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());

create policy "posts_delete_own_or_mod"
  on public.posts for delete
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

-- post_comments --------------------------------------------------------------
alter table public.post_comments enable row level security;

create policy "comments_select_visible"
  on public.post_comments for select
  to authenticated
  using (is_deleted = false or public.is_moderator());

create policy "comments_insert_own"
  on public.post_comments for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_not_banned());

create policy "comments_update_own"
  on public.post_comments for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy "comments_delete_own_or_mod"
  on public.post_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

-- post_likes -----------------------------------------------------------------
alter table public.post_likes enable row level security;

create policy "likes_select_all"
  on public.post_likes for select
  to authenticated
  using (true);

create policy "likes_insert_own"
  on public.post_likes for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "likes_delete_own"
  on public.post_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- courses --------------------------------------------------------------------
alter table public.courses enable row level security;

create policy "courses_select_published_or_mod"
  on public.courses for select
  to authenticated
  using (status = 'published' or public.is_moderator());

create policy "courses_mod_write"
  on public.courses for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- course_modules -------------------------------------------------------------
alter table public.course_modules enable row level security;

create policy "modules_select_all"
  on public.course_modules for select
  to authenticated
  using (true);

create policy "modules_mod_write"
  on public.course_modules for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- lessons --------------------------------------------------------------------
alter table public.lessons enable row level security;

create policy "lessons_select_all"
  on public.lessons for select
  to authenticated
  using (true);

create policy "lessons_mod_write"
  on public.lessons for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- lesson_progress ------------------------------------------------------------
alter table public.lesson_progress enable row level security;

create policy "progress_select_own_or_mod"
  on public.lesson_progress for select
  to authenticated
  using (user_id = auth.uid() or public.is_moderator());

create policy "progress_insert_own"
  on public.lesson_progress for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "progress_update_own"
  on public.lesson_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "progress_delete_own"
  on public.lesson_progress for delete
  to authenticated
  using (user_id = auth.uid());

-- lesson_comments ------------------------------------------------------------
alter table public.lesson_comments enable row level security;

create policy "lesson_comments_select"
  on public.lesson_comments for select
  to authenticated
  using (is_deleted = false or public.is_moderator());

create policy "lesson_comments_insert_own"
  on public.lesson_comments for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_not_banned());

create policy "lesson_comments_update_own"
  on public.lesson_comments for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy "lesson_comments_delete_own_or_mod"
  on public.lesson_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

-- resources ------------------------------------------------------------------
alter table public.resources enable row level security;

create policy "resources_select_all"
  on public.resources for select
  to authenticated
  using (true);

create policy "resources_mod_write"
  on public.resources for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- apps -----------------------------------------------------------------------
alter table public.apps enable row level security;

create policy "apps_select_all"
  on public.apps for select
  to authenticated
  using (true);

create policy "apps_admin_write"
  on public.apps for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- events ---------------------------------------------------------------------
alter table public.events enable row level security;

create policy "events_select_all"
  on public.events for select
  to authenticated
  using (true);

create policy "events_mod_write"
  on public.events for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- event_attendees ------------------------------------------------------------
alter table public.event_attendees enable row level security;

create policy "attendees_select_all"
  on public.event_attendees for select
  to authenticated
  using (true);

create policy "attendees_insert_own"
  on public.event_attendees for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "attendees_update_own"
  on public.event_attendees for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "attendees_delete_own"
  on public.event_attendees for delete
  to authenticated
  using (user_id = auth.uid());

-- points_ledger --------------------------------------------------------------
alter table public.points_ledger enable row level security;

create policy "points_select_own_or_mod"
  on public.points_ledger for select
  to authenticated
  using (user_id = auth.uid() or public.is_moderator());

-- (sem insert direto — sempre via função award_points security definer)

-- notifications --------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- settings -------------------------------------------------------------------
alter table public.settings enable row level security;

create policy "settings_select_all"
  on public.settings for select
  to authenticated
  using (true);

create policy "settings_admin_write"
  on public.settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
-- =============================================================================
-- 0007 — Buckets de Storage + Policies
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',       'avatars',       true,  5242880,   array['image/png','image/jpeg','image/webp','image/gif']),
  ('post-media',    'post-media',    true,  52428800,  array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm']),
  ('videos',        'videos',        false, 524288000, array['video/mp4','video/webm','video/quicktime']),
  ('resources',     'resources',     false, 104857600, null),
  ('apps',          'apps',          false, 52428800,  null),
  ('course-covers', 'course-covers', true,  10485760,  array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- avatars — dono escreve, todos lêem
-- -----------------------------------------------------------------------------
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_not_banned()
  );

create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- post-media — usuário autenticado e não-banido pode subir; só dono apaga
-- -----------------------------------------------------------------------------
create policy "post_media_public_read"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "post_media_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and public.is_not_banned()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_media_owner_or_mod_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator())
  );

-- -----------------------------------------------------------------------------
-- videos / resources / apps / course-covers — moderador/admin
-- -----------------------------------------------------------------------------
create policy "videos_auth_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'videos');

create policy "videos_mod_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'videos' and public.is_moderator());

create policy "videos_mod_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'videos' and public.is_moderator());

create policy "videos_mod_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'videos' and public.is_moderator());

-- resources
create policy "resources_auth_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resources');

create policy "resources_mod_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resources' and public.is_moderator());

create policy "resources_mod_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resources' and public.is_moderator());

-- apps
create policy "apps_auth_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'apps');

create policy "apps_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'apps' and public.is_admin());

create policy "apps_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'apps' and public.is_admin());

-- course-covers
create policy "covers_public_read"
  on storage.objects for select
  using (bucket_id = 'course-covers');

create policy "covers_mod_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'course-covers' and public.is_moderator());

create policy "covers_mod_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'course-covers' and public.is_moderator());
