-- =============================================================================
-- 0022 — Notificacao de DM nova (COALESCIDA e ATOMICA) — espelha o padrao do 0008
-- Ao inserir mensagem, notifica o OUTRO participante. Para nao spammar, coalesce:
-- 1 notificacao NAO-LIDA por conversa (mensagens seguintes so renovam body/hora).
-- A coalescencia e ATOMICA via indice parcial unico + INSERT ... ON CONFLICT
-- (evita duplicata em envios concorrentes). Marcada lida ao abrir a conversa
-- (markConversationRead). SECURITY DEFINER (notifications so aceita insert de definer).
-- Idempotente.
-- =============================================================================

-- Colunas de referencia (linkar/coalescer notificacoes; nullable).
alter table public.notifications
  add column if not exists reference_type text,
  add column if not exists reference_id uuid;

-- No maximo 1 notificacao NAO-LIDA por (user, referencia): serializa inserts
-- concorrentes e serve de indice de lookup do coalesce. Parcial: nao afeta
-- notificacoes sem referencia (curtida/comentario tem reference_id null).
create unique index if not exists notifications_unread_ref_uidx
  on public.notifications (user_id, reference_type, reference_id)
  where read_at is null and reference_id is not null;

create or replace function public.handle_dm_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_recipient uuid;
  v_actor_name text;
begin
  select case when c.user_a = new.sender_id then c.user_b else c.user_a end
    into v_recipient
  from public.dm_conversations c
  where c.id = new.conversation_id;

  if v_recipient is null or v_recipient = new.sender_id then
    return new;
  end if;

  select coalesce(full_name, 'Alguém') into v_actor_name
  from public.profiles where id = new.sender_id;

  insert into public.notifications (user_id, title, body, type, reference_type, reference_id)
  values (
    v_recipient, 'Nova mensagem', v_actor_name || ' te enviou uma mensagem',
    'dm', 'dm_conversation', new.conversation_id
  )
  on conflict (user_id, reference_type, reference_id) where read_at is null and reference_id is not null
  do update set body = excluded.body, created_at = now();

  return new;
end;
$$;

drop trigger if exists direct_messages_notify on public.direct_messages;
create trigger direct_messages_notify
  after insert on public.direct_messages
  for each row execute function public.handle_dm_notify();
