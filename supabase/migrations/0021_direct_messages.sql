-- 0021: Direct Messages (DM 1:1) — FEATURE 03
-- Conversas privadas entre 2 membros + bloqueio + denuncia. RLS por participante
-- (+ auditoria admin/owner, read-only). Realtime nas mensagens e nas conversas.

-- Helpers -------------------------------------------------------------------

-- Auditoria de DMs reusa a public.is_admin() JA EXISTENTE (0001: role='admin' e
-- not banned) — consistente com o requireAdmin() que protege toda a area /admin.
-- NAO redefinir is_admin() aqui: ela e usada por policies de varias outras
-- tabelas (profiles, apps, storage, modulos...); redefinir mudaria todas.

-- Tabelas -------------------------------------------------------------------

-- 1 conversa por par (ordem canonica user_a < user_b colapsa (X,Y) e (Y,X)).
create table if not exists public.dm_conversations (
  id uuid primary key default gen_random_uuid(),
  user_a uuid not null references public.profiles(id) on delete cascade,
  user_b uuid not null references public.profiles(id) on delete cascade,
  last_message_at timestamptz not null default now(),
  user_a_last_read_at timestamptz not null default now(),
  user_b_last_read_at timestamptz not null default now(),
  created_at timestamptz not null default now(),
  constraint dm_conversations_pair_order check (user_a < user_b),
  constraint dm_conversations_pair_unique unique (user_a, user_b)
);

create table if not exists public.direct_messages (
  id uuid primary key default gen_random_uuid(),
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  sender_id uuid not null references public.profiles(id) on delete cascade,
  body text not null,
  is_deleted boolean not null default false,
  edited_at timestamptz,
  created_at timestamptz not null default now()
);

create table if not exists public.dm_blocks (
  blocker_id uuid not null references public.profiles(id) on delete cascade,
  blocked_id uuid not null references public.profiles(id) on delete cascade,
  created_at timestamptz not null default now(),
  primary key (blocker_id, blocked_id)
);

create table if not exists public.dm_reports (
  id uuid primary key default gen_random_uuid(),
  reporter_id uuid not null references public.profiles(id) on delete cascade,
  conversation_id uuid not null references public.dm_conversations(id) on delete cascade,
  reason text not null,
  created_at timestamptz not null default now()
);

-- Existe bloqueio em QUALQUER direcao entre o usuario atual e `other`.
-- SECURITY DEFINER: o remetente nao enxerga (por RLS) o bloqueio criado pelo outro.
create or replace function public.is_dm_blocked(other uuid)
returns boolean language sql stable security definer
set search_path = public as $$
  select exists(
    select 1 from public.dm_blocks
    where (blocker_id = auth.uid() and blocked_id = other)
       or (blocker_id = other and blocked_id = auth.uid())
  );
$$;

-- Conversas com mensagens ainda nao lidas pelo usuario atual (badge da nav).
-- Ao enviar, o remetente atualiza last_message_at E seu proprio last_read juntos
-- (mesma ts) -> a propria mensagem nao conta; so as recebidas contam.
create or replace function public.dm_unread_count()
returns integer language sql stable security definer
set search_path = public as $$
  select count(*)::int from public.dm_conversations c
  where (c.user_a = auth.uid() and c.last_message_at > c.user_a_last_read_at)
     or (c.user_b = auth.uid() and c.last_message_at > c.user_b_last_read_at);
$$;

-- Indices -------------------------------------------------------------------

create index if not exists direct_messages_conversation_idx
  on public.direct_messages (conversation_id, created_at desc);
create index if not exists dm_conversations_user_a_idx on public.dm_conversations (user_a);
create index if not exists dm_conversations_user_b_idx on public.dm_conversations (user_b);
create index if not exists dm_reports_conversation_idx on public.dm_reports (conversation_id);

-- RLS -----------------------------------------------------------------------

alter table public.dm_conversations enable row level security;
alter table public.direct_messages enable row level security;
alter table public.dm_blocks enable row level security;
alter table public.dm_reports enable row level security;

-- dm_conversations: participantes (ou admin, auditoria).
create policy "dm_conversations_select_participant_or_admin"
  on public.dm_conversations for select to authenticated
  using (user_a = auth.uid() or user_b = auth.uid() or public.is_admin());

create policy "dm_conversations_insert_participant"
  on public.dm_conversations for insert to authenticated
  with check ((user_a = auth.uid() or user_b = auth.uid()) and public.is_not_banned());

create policy "dm_conversations_update_participant"
  on public.dm_conversations for update to authenticated
  using (user_a = auth.uid() or user_b = auth.uid())
  with check (user_a = auth.uid() or user_b = auth.uid());

-- direct_messages: SELECT participante-da-conversa ou admin; UPDATE so o remetente
-- (admin audita = read-only, nao edita/apaga DM alheia).
create policy "direct_messages_select_participant_or_admin"
  on public.direct_messages for select to authenticated
  using (
    exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
    or public.is_admin()
  );

create policy "direct_messages_insert_own_participant"
  on public.direct_messages for insert to authenticated
  with check (
    sender_id = auth.uid()
    and public.is_not_banned()
    and exists (
      select 1 from public.dm_conversations c
      where c.id = conversation_id
        and (c.user_a = auth.uid() or c.user_b = auth.uid())
    )
  );

create policy "direct_messages_update_own"
  on public.direct_messages for update to authenticated
  using (sender_id = auth.uid())
  with check (sender_id = auth.uid());

-- dm_blocks: cada um gerencia so os proprios bloqueios.
create policy "dm_blocks_select_own"
  on public.dm_blocks for select to authenticated
  using (blocker_id = auth.uid());
create policy "dm_blocks_insert_own"
  on public.dm_blocks for insert to authenticated
  with check (blocker_id = auth.uid() and public.is_not_banned());
create policy "dm_blocks_delete_own"
  on public.dm_blocks for delete to authenticated
  using (blocker_id = auth.uid());

-- dm_reports: denunciante cria; le a propria denuncia; admin le todas.
create policy "dm_reports_insert_own"
  on public.dm_reports for insert to authenticated
  with check (reporter_id = auth.uid() and public.is_not_banned());
create policy "dm_reports_select_own_or_admin"
  on public.dm_reports for select to authenticated
  using (reporter_id = auth.uid() or public.is_admin());

-- Grants (espelha tabelas existentes) --------------------------------------

grant select, insert, update on public.dm_conversations to authenticated;
grant select, insert, update on public.direct_messages to authenticated;
grant select, insert, delete on public.dm_blocks to authenticated;
grant select, insert on public.dm_reports to authenticated;

-- Realtime ------------------------------------------------------------------

do $$
begin
  if exists (select 1 from pg_publication where pubname = 'supabase_realtime') then
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'direct_messages'
    ) then
      alter publication supabase_realtime add table public.direct_messages;
    end if;
    if not exists (
      select 1 from pg_publication_tables
      where pubname = 'supabase_realtime' and schemaname = 'public' and tablename = 'dm_conversations'
    ) then
      alter publication supabase_realtime add table public.dm_conversations;
    end if;
  end if;
end $$;
