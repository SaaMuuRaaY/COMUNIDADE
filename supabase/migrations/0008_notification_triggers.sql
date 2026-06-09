-- =============================================================================
-- 0008 — Notificações automáticas
-- Cria notificações quando alguém comenta ou curte a sua publicação.
-- Idempotente: pode ser reaplicada com segurança.
-- =============================================================================

-- Comentário no seu post -------------------------------------------------------
create or replace function public.handle_comment_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_post_title text;
  v_actor_name text;
begin
  select author_id, coalesce(nullif(title, ''), 'sua publicação')
    into v_author, v_post_title
  from public.posts where id = new.post_id;

  -- não notifica autor comentando o próprio post
  if v_author is null or v_author = new.author_id then
    return new;
  end if;

  select coalesce(full_name, 'Alguém') into v_actor_name
  from public.profiles where id = new.author_id;

  insert into public.notifications (user_id, title, body, type)
  values (
    v_author,
    'Novo comentário',
    v_actor_name || ' comentou em "' || v_post_title || '"',
    'comment'
  );

  return new;
end;
$$;

drop trigger if exists post_comments_notify on public.post_comments;
create trigger post_comments_notify
  after insert on public.post_comments
  for each row execute function public.handle_comment_notify();

-- Curtida no seu post ----------------------------------------------------------
create or replace function public.handle_like_notify()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  v_author uuid;
  v_post_title text;
  v_actor_name text;
begin
  select author_id, coalesce(nullif(title, ''), 'sua publicação')
    into v_author, v_post_title
  from public.posts where id = new.post_id;

  if v_author is null or v_author = new.user_id then
    return new;
  end if;

  select coalesce(full_name, 'Alguém') into v_actor_name
  from public.profiles where id = new.user_id;

  insert into public.notifications (user_id, title, body, type)
  values (
    v_author,
    'Nova curtida',
    v_actor_name || ' curtiu "' || v_post_title || '"',
    'like'
  );

  return new;
end;
$$;

drop trigger if exists post_likes_notify on public.post_likes;
create trigger post_likes_notify
  after insert on public.post_likes
  for each row execute function public.handle_like_notify();
