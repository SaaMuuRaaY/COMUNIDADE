-- =============================================================================
-- 0014 — Comunidade: permissões por canal na RLS (Fase 4)
-- -----------------------------------------------------------------------------
-- Reforça no BANCO (última linha de defesa, além de UI + Server Action) a regra
-- de publicação/comentário por canal da config estática (src/lib/community/
-- structure.ts). A allowlist de slugs abaixo é defesa em profundidade intencional
-- (espelha a config TypeScript).
--
-- RETROCOMPATÍVEL: slugs ANTIGOS (geral, duvidas, …) não são restritos nem
-- bloqueiam comentário → publicação/comentário existentes seguem funcionando.
-- Idempotente. Backup recomendado antes de aplicar na cloud.
-- =============================================================================

-- Funções puras (imutáveis) que classificam um slug de canal ---------------------
create or replace function public.channel_requires_mod(slug text)
returns boolean language sql immutable as $$
  select slug in ('comunicados', 'lives-encontros', 'comece-por-aqui', 'beneficios', 'cupons-descontos');
$$;

create or replace function public.channel_requires_admin(slug text)
returns boolean language sql immutable as $$
  select slug in ('comece-por-aqui', 'beneficios', 'cupons-descontos');
$$;

create or replace function public.channel_allows_comments(slug text)
returns boolean language sql immutable as $$
  select slug not in ('comece-por-aqui', 'beneficios', 'cupons-descontos');
$$;

-- posts: INSERT — quem publica precisa satisfazer o papel do canal ---------------
drop policy if exists "posts_insert_own" on public.posts;
create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_not_banned()
    and (not public.channel_requires_mod(category) or public.is_moderator())
    and (not public.channel_requires_admin(category) or public.is_admin())
  );

-- posts: UPDATE — autor/mod podem editar; ninguém move p/ canal restrito sem ser
-- moderador (impede membro mover post p/ canal oficial via PostgREST direto).
-- Nota: a precisão admin-only ao MOVER fica no Server Action (mod pode moderar/
-- fixar em qualquer canal, então o WITH CHECK de UPDATE usa só requires_mod).
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (
    (author_id = auth.uid() or public.is_moderator())
    and (not public.channel_requires_mod(category) or public.is_moderator())
  );

-- post_comments: INSERT — respeita canais sem comentário (mod é exceção) ---------
drop policy if exists "comments_insert_own" on public.post_comments;
create policy "comments_insert_own"
  on public.post_comments for insert
  to authenticated
  with check (
    author_id = auth.uid()
    and public.is_not_banned()
    and (
      public.is_moderator()
      or public.channel_allows_comments((select p.category from public.posts p where p.id = post_id))
    )
  );
