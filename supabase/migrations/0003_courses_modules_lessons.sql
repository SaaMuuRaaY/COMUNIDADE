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
