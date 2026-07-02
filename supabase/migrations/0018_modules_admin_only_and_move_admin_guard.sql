-- =============================================================================
-- 0018 — FEATURE 01 / D2 + residual F3: módulos admin-only + guarda de move admin
-- -----------------------------------------------------------------------------
-- (D2) Criação/edição/exclusão de MÓDULOS (cursos, módulos, aulas, recursos,
-- eventos) passa a exigir ADMIN (antes: moderador). Apps já era admin. Espelha
-- as Server Actions (requireModerator→requireAdmin). Interações de membro
-- (lesson_progress, lesson_comments, event_attendees/RSVP) permanecem inalteradas.
--
-- (Residual F3) A RLS de UPDATE de posts (`posts_update_own`) passa a checar
-- também channel_requires_admin — impede que um moderador MOVA um post para um
-- canal admin-only via PostgREST direto (antes só o Server Action barrava).
--
-- Aditiva/idempotente. Não altera dados. NÃO aplicar na cloud sem aprovação.
-- =============================================================================

-- (D2) courses / course_modules / lessons / resources / events → admin ----------
drop policy if exists "courses_mod_write" on public.courses;
create policy "courses_admin_write"
  on public.courses for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "modules_mod_write" on public.course_modules;
create policy "modules_admin_write"
  on public.course_modules for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "lessons_mod_write" on public.lessons;
create policy "lessons_admin_write"
  on public.lessons for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "resources_mod_write" on public.resources;
create policy "resources_admin_write"
  on public.resources for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

drop policy if exists "events_mod_write" on public.events;
create policy "events_admin_write"
  on public.events for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- (Residual F3) UPDATE de posts: fecha o move para canal admin-only via API ------
drop policy if exists "posts_update_own" on public.posts;
create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (
    (author_id = auth.uid() or public.is_moderator())
    and (not public.channel_requires_mod(category) or public.is_moderator())
    and (not public.channel_requires_admin(category) or public.is_admin())
  );

-- =============================================================================
-- ROLLBACK (volta ao estado 0014/0006):
--   drop policy if exists "courses_admin_write" on public.courses;
--   create policy "courses_mod_write" on public.courses for all to authenticated
--     using (public.is_moderator()) with check (public.is_moderator());
--   -- (idem para modules_mod_write/lessons_mod_write/resources_mod_write/events_mod_write)
--   drop policy if exists "posts_update_own" on public.posts;
--   create policy "posts_update_own" on public.posts for update to authenticated
--     using (author_id = auth.uid() or public.is_moderator())
--     with check ((author_id = auth.uid() or public.is_moderator())
--       and (not public.channel_requires_mod(category) or public.is_moderator()));
-- =============================================================================
