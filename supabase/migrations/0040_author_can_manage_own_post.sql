-- =============================================================================
-- 0040 — O autor pode gerir (editar / soft-delete) o próprio post
--
-- Membro comum não conseguia excluir NEM editar o próprio post. Duas causas de RLS
-- (o erro "new row violates row-level security policy for table posts"):
--
-- CAUSA 1 (geral, qualquer canal) — a SELECT policy `posts_select_visible` só via
--   `is_deleted = false OR is_moderator()`. Ao soft-deletar (update is_deleted=true),
--   a linha resultante fica INVISÍVEL ao próprio autor sob essa policy, e o Postgres
--   barra a escrita. Fix: a policy passa a incluir o autor.
--
-- CAUSA 2 (canais restritos) — o WITH CHECK de posts_update_own (0018) reavaliava as
--   condições de canal (channel_requires_mod/admin) sobre a LINHA INTEIRA, incluindo a
--   `category` já salva. Posts de membro em canais que viraram restritos depois (0017)
--   ficavam impossíveis de editar/apagar pelo autor. Fix: o WITH CHECK vira só "autor
--   ou moderador"; a trava de canal passa a valer SÓ AO MOVER (mudar category), via
--   trigger que compara OLD vs NEW — o que o WITH CHECK não consegue fazer.
--
-- Resultado: autor edita/soft-deleta o próprio post em qualquer canal; mover PARA um
-- canal que exige mod/admin ainda pede o papel; CRIAR em canal restrito segue barrado
-- (posts_insert_own, inalterada). O feed não vaza posts apagados: as queries filtram
-- is_deleted=false explicitamente (src/server/queries/posts.ts).
-- =============================================================================

-- 0. SELECT: o autor enxerga o próprio post mesmo apagado (senão não soft-deleta) ---
drop policy if exists "posts_select_visible" on public.posts;
create policy "posts_select_visible"
  on public.posts for select
  using (is_deleted = false or author_id = auth.uid() or public.is_moderator());

-- 1. WITH CHECK sem as condições de canal (a trava de canal migra para o trigger) --
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());

-- 2. Trava de canal só na MUDANÇA de canal (mover) -----------------------------
create or replace function public.enforce_post_channel_on_move()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if new.category is distinct from old.category then
    if public.channel_requires_admin(new.category) and not public.is_admin() then
      raise exception 'Sem permissão para mover a publicação para este canal.';
    end if;
    if public.channel_requires_mod(new.category) and not public.is_moderator() then
      raise exception 'Sem permissão para mover a publicação para este canal.';
    end if;
  end if;
  return new;
end;
$$;

-- `of category`: o trigger só dispara quando a UPDATE mexe na coluna category —
-- soft-delete (só is_deleted) e edição de título/corpo nunca o acionam.
drop trigger if exists posts_enforce_channel_move on public.posts;
create trigger posts_enforce_channel_move
  before update of category on public.posts
  for each row execute function public.enforce_post_channel_on_move();
