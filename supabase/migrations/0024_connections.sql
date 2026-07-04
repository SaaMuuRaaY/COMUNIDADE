-- =============================================================================
-- 0024 — Conexoes: Seguir (unilateral) + Amigos (pedido -> aceite). FEATURE 04 F4.
-- =============================================================================

-- Seguir (unilateral) --------------------------------------------------------
create table if not exists public.follows (
  follower_id uuid not null references public.profiles(id) on delete cascade,
  following_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (follower_id, following_id),
  constraint follows_no_self check (follower_id <> following_id)
);
create index if not exists follows_following_idx on public.follows (following_id);

alter table public.follows enable row level security;
-- Contadores publicos: qualquer autenticado le. Gerencia so os proprios.
create policy "follows_select_all"
  on public.follows for select to authenticated using (true);
create policy "follows_insert_own"
  on public.follows for insert to authenticated
  with check (follower_id = auth.uid() and public.is_not_banned());
create policy "follows_delete_own"
  on public.follows for delete to authenticated using (follower_id = auth.uid());
grant select, insert, delete on public.follows to authenticated;

-- Amigos (pedido -> aceite) --------------------------------------------------
create table if not exists public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references public.profiles(id) on delete cascade,
  addressee_id uuid not null references public.profiles(id) on delete cascade,
  status text not null default 'pending' check (status in ('pending','accepted')),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_no_self check (requester_id <> addressee_id)
);
-- 1 relacao por par, independente da direcao (par canonico).
create unique index if not exists friendships_pair_uidx
  on public.friendships (least(requester_id, addressee_id), greatest(requester_id, addressee_id));
create index if not exists friendships_addressee_idx on public.friendships (addressee_id, status);
create index if not exists friendships_requester_idx on public.friendships (requester_id, status);

alter table public.friendships enable row level security;
-- SELECT/DELETE: os 2 participantes. INSERT: eu como requester. UPDATE (aceitar/
-- recusar): so o addressee.
create policy "friendships_select_participant"
  on public.friendships for select to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
-- INSERT sempre como 'pending' (impede forjar amizade aceita sem o outro consentir).
create policy "friendships_insert_own"
  on public.friendships for insert to authenticated
  with check (requester_id = auth.uid() and status = 'pending' and public.is_not_banned());
create policy "friendships_update_addressee"
  on public.friendships for update to authenticated
  using (addressee_id = auth.uid())
  with check (addressee_id = auth.uid() and public.is_not_banned());
create policy "friendships_delete_participant"
  on public.friendships for delete to authenticated
  using (requester_id = auth.uid() or addressee_id = auth.uid());
grant select, insert, update, delete on public.friendships to authenticated;
