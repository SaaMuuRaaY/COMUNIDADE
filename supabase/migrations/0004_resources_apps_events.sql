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
