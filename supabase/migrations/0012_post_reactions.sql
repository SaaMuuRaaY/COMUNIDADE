-- =============================================================================
-- 0012 — Reações por emoji (Fase 4 / 4B-2)
-- Aditivo: NÃO altera post_likes, triggers de pontos nem a contagem de likes.
-- Reações NÃO dão pontos (o like segue como driver de gamificação).
-- Idempotente: pode ser reaplicada com segurança.
-- =============================================================================

create table if not exists public.post_reactions (
  id uuid primary key default gen_random_uuid(),
  post_id uuid not null references public.posts(id) on delete cascade,
  user_id uuid not null references public.profiles(id) on delete cascade,
  emoji text not null check (emoji in ('👍','❤️','😂','🎉','🔥','😮')),
  created_at timestamptz not null default now(),
  unique(post_id, user_id, emoji)
);

create index if not exists post_reactions_post_idx on public.post_reactions(post_id);
create index if not exists post_reactions_user_idx on public.post_reactions(user_id);

alter table public.post_reactions enable row level security;

drop policy if exists "reactions_select_all" on public.post_reactions;
create policy "reactions_select_all"
  on public.post_reactions for select
  to authenticated
  using (true);

drop policy if exists "reactions_insert_own" on public.post_reactions;
create policy "reactions_insert_own"
  on public.post_reactions for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

drop policy if exists "reactions_delete_own" on public.post_reactions;
create policy "reactions_delete_own"
  on public.post_reactions for delete
  to authenticated
  using (user_id = auth.uid());
