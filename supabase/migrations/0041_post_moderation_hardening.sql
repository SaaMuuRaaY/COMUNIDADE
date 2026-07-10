-- =============================================================================
-- 0041 — Endurecimento pós-auditoria da 0040 (gestão do próprio post)
--
-- A 0040 deixou o autor gerir o próprio post (correto), mas a auditoria adversarial
-- (teste real no banco) achou 3 pontos:
--
-- 1. MÉDIO-ALTO — bypass de moderação: um autor comum conseguia DESFAZER o soft-delete
--    de um moderador (is_deleted true->false), restaurando um post que a moderação
--    removeu (via chamada direta ao Supabase, fora da UI). Fix: só a moderação restaura.
-- 2. BAIXA (pré-existente desde 0006) — posts_update_own nunca checou is_not_banned():
--    um membro banido editava/soft-deletava o próprio post. Fix: espelhar posts_insert_own.
-- 3. BAIXA (defensivo) — a função de trigger da 0040 (SECURITY DEFINER) não tinha REVOKE.
-- =============================================================================

-- 1. is_not_banned() no WITH CHECK de posts_update_own (espelha posts_insert_own) --
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check ((author_id = auth.uid() and public.is_not_banned()) or public.is_moderator());

-- 2. Restaurar (undelete) é só da moderação -----------------------------------
-- O autor soft-deleta o próprio post (false->true); reverter (true->false) exige papel,
-- senão o membro anula a decisão do moderador. O WITH CHECK não compara OLD/NEW, então
-- a trava vai num trigger, como o de canal.
create or replace function public.enforce_post_undelete_mod_only()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.is_deleted and not new.is_deleted and not public.is_moderator() then
    raise exception 'Apenas a moderação pode restaurar uma publicação removida.';
  end if;
  return new;
end;
$$;

drop trigger if exists posts_enforce_undelete on public.posts;
create trigger posts_enforce_undelete
  before update of is_deleted on public.posts
  for each row execute function public.enforce_post_undelete_mod_only();

-- 3. REVOKE nas funções de trigger (SECURITY DEFINER) — trigger-only, defensivo ----
revoke execute on function public.enforce_post_undelete_mod_only() from public, anon, authenticated;
revoke execute on function public.enforce_post_channel_on_move() from public, anon, authenticated;
