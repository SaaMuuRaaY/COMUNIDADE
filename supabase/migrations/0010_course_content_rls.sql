-- =============================================================================
-- 0010 — Fase 1 Produção Segura
-- SEC-03: fechar leitura de aulas/módulos de cursos `draft`.
-- Antes: modules_select_all / lessons_select_all usavam USING(true), expondo
-- video_url/content de cursos não publicados a qualquer authenticated.
-- Agora: só lê se o curso pai está 'published' OU se o usuário é moderador/admin.
-- Idempotente: pode ser reaplicada com segurança.
-- =============================================================================

-- course_modules --------------------------------------------------------------
drop policy if exists "modules_select_all" on public.course_modules;
drop policy if exists "modules_select_published_or_mod" on public.course_modules;
create policy "modules_select_published_or_mod"
  on public.course_modules for select
  to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = course_modules.course_id
        and (c.status = 'published' or public.is_moderator())
    )
  );

-- lessons ---------------------------------------------------------------------
drop policy if exists "lessons_select_all" on public.lessons;
drop policy if exists "lessons_select_published_or_mod" on public.lessons;
create policy "lessons_select_published_or_mod"
  on public.lessons for select
  to authenticated
  using (
    exists (
      select 1 from public.courses c
      where c.id = lessons.course_id
        and (c.status = 'published' or public.is_moderator())
    )
  );
