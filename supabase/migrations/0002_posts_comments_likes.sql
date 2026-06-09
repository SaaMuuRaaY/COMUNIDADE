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
