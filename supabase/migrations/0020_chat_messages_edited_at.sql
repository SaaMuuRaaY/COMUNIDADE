-- 0020: editar mensagem do chat da comunidade
-- Marca quando a mensagem foi editada (null = nunca editada). O UPDATE ja e
-- coberto pela policy chat_messages_update_own_or_mod (0019); a edicao de corpo
-- e restrita ao AUTOR na Server Action (moderador so remove, nao edita texto).
alter table public.chat_messages
  add column if not exists edited_at timestamptz;
