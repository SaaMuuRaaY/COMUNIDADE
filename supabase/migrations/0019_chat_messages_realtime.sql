-- =============================================================================
-- 0019 — FEATURE 02: chat em tempo real (chat_messages)
-- -----------------------------------------------------------------------------
-- Substitui o feed `chat-networking` por um CHAT realtime (rota /chat-e-networking).
-- MVP: 1 sala da comunidade + histórico persistido. Espelha o padrão de
-- post_comments (author_id + is_deleted + created_at) e a RLS (0006/0009/0014).
-- Primeira tabela do projeto na publicação supabase_realtime.
--
-- Aditiva (tabela NOVA — não toca dados existentes). NÃO aplicar na cloud sem
-- aprovação (release-time da FEATURE 02).
-- =============================================================================

create table if not exists public.chat_messages (
  id uuid primary key default gen_random_uuid(),
  room text not null default 'community',
  author_id uuid not null references public.profiles(id) on delete cascade,
  author_name text,
  author_avatar text,
  body text not null,
  is_deleted boolean not null default false,
  created_at timestamptz not null default now()
);

create index if not exists chat_messages_room_created_idx
  on public.chat_messages (room, created_at desc);

alter table public.chat_messages enable row level security;

-- SELECT: sala pública da comunidade — todo autenticado lê (banido é barrado na
-- rota, no layout (app)). Cliente esconde mensagens com is_deleted=true.
drop policy if exists "chat_messages_select_all" on public.chat_messages;
create policy "chat_messages_select_all"
  on public.chat_messages for select
  to authenticated
  using (true);

-- INSERT: só o próprio autor, não banido.
drop policy if exists "chat_messages_insert_own" on public.chat_messages;
create policy "chat_messages_insert_own"
  on public.chat_messages for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_not_banned());

-- UPDATE (soft-delete): autor ou moderador.
drop policy if exists "chat_messages_update_own_or_mod" on public.chat_messages;
create policy "chat_messages_update_own_or_mod"
  on public.chat_messages for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());

grant select, insert, update on public.chat_messages to authenticated;

-- Habilita realtime (postgres_changes) para a tabela — idempotente.
do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime')
     and not exists (
       select 1 from pg_publication_tables
       where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'chat_messages'
     ) then
    alter publication supabase_realtime add table public.chat_messages;
  end if;
end $$;

-- =============================================================================
-- ROLLBACK:
--   do $$ begin
--     if exists (select 1 from pg_publication_tables where pubname='supabase_realtime'
--       and schemaname='public' and tablename='chat_messages') then
--       alter publication supabase_realtime drop table public.chat_messages;
--     end if; end $$;
--   drop table if exists public.chat_messages;
-- =============================================================================
