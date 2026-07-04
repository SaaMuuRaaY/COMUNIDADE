-- =============================================================================
-- 0023 — Posts salvos (bookmarks), privados do usuario. FEATURE 04 Fase 3.
-- =============================================================================

create table if not exists public.saved_posts (
  user_id uuid not null references public.profiles(id) on delete cascade,
  post_id uuid not null references public.posts(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (user_id, post_id)
);

create index if not exists saved_posts_user_idx on public.saved_posts (user_id, created_at desc);

alter table public.saved_posts enable row level security;

-- Privado: cada um so ve/gerencia os proprios salvos.
create policy "saved_posts_select_own"
  on public.saved_posts for select to authenticated
  using (user_id = auth.uid());

create policy "saved_posts_insert_own"
  on public.saved_posts for insert to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "saved_posts_delete_own"
  on public.saved_posts for delete to authenticated
  using (user_id = auth.uid());

grant select, insert, delete on public.saved_posts to authenticated;
