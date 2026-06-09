-- =============================================================================
-- 0006 — Row Level Security (RLS)
-- =============================================================================

-- profiles -------------------------------------------------------------------
alter table public.profiles enable row level security;

create policy "profiles_select_all"
  on public.profiles for select
  to authenticated
  using (true);

create policy "profiles_update_own"
  on public.profiles for update
  to authenticated
  using (id = auth.uid())
  with check (id = auth.uid() and role = (select role from public.profiles where id = auth.uid()));

create policy "profiles_admin_all"
  on public.profiles for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- communities ----------------------------------------------------------------
alter table public.communities enable row level security;

create policy "communities_select_all"
  on public.communities for select
  to authenticated
  using (true);

create policy "communities_admin_write"
  on public.communities for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- community_members ----------------------------------------------------------
alter table public.community_members enable row level security;

create policy "community_members_select_all"
  on public.community_members for select
  to authenticated
  using (true);

create policy "community_members_insert_self"
  on public.community_members for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "community_members_admin_all"
  on public.community_members for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- posts ----------------------------------------------------------------------
alter table public.posts enable row level security;

create policy "posts_select_visible"
  on public.posts for select
  to authenticated
  using (is_deleted = false or public.is_moderator());

create policy "posts_insert_own"
  on public.posts for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_not_banned());

create policy "posts_update_own"
  on public.posts for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator())
  with check (author_id = auth.uid() or public.is_moderator());

create policy "posts_delete_own_or_mod"
  on public.posts for delete
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

-- post_comments --------------------------------------------------------------
alter table public.post_comments enable row level security;

create policy "comments_select_visible"
  on public.post_comments for select
  to authenticated
  using (is_deleted = false or public.is_moderator());

create policy "comments_insert_own"
  on public.post_comments for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_not_banned());

create policy "comments_update_own"
  on public.post_comments for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy "comments_delete_own_or_mod"
  on public.post_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

-- post_likes -----------------------------------------------------------------
alter table public.post_likes enable row level security;

create policy "likes_select_all"
  on public.post_likes for select
  to authenticated
  using (true);

create policy "likes_insert_own"
  on public.post_likes for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "likes_delete_own"
  on public.post_likes for delete
  to authenticated
  using (user_id = auth.uid());

-- courses --------------------------------------------------------------------
alter table public.courses enable row level security;

create policy "courses_select_published_or_mod"
  on public.courses for select
  to authenticated
  using (status = 'published' or public.is_moderator());

create policy "courses_mod_write"
  on public.courses for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- course_modules -------------------------------------------------------------
alter table public.course_modules enable row level security;

create policy "modules_select_all"
  on public.course_modules for select
  to authenticated
  using (true);

create policy "modules_mod_write"
  on public.course_modules for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- lessons --------------------------------------------------------------------
alter table public.lessons enable row level security;

create policy "lessons_select_all"
  on public.lessons for select
  to authenticated
  using (true);

create policy "lessons_mod_write"
  on public.lessons for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- lesson_progress ------------------------------------------------------------
alter table public.lesson_progress enable row level security;

create policy "progress_select_own_or_mod"
  on public.lesson_progress for select
  to authenticated
  using (user_id = auth.uid() or public.is_moderator());

create policy "progress_insert_own"
  on public.lesson_progress for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "progress_update_own"
  on public.lesson_progress for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "progress_delete_own"
  on public.lesson_progress for delete
  to authenticated
  using (user_id = auth.uid());

-- lesson_comments ------------------------------------------------------------
alter table public.lesson_comments enable row level security;

create policy "lesson_comments_select"
  on public.lesson_comments for select
  to authenticated
  using (is_deleted = false or public.is_moderator());

create policy "lesson_comments_insert_own"
  on public.lesson_comments for insert
  to authenticated
  with check (author_id = auth.uid() and public.is_not_banned());

create policy "lesson_comments_update_own"
  on public.lesson_comments for update
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

create policy "lesson_comments_delete_own_or_mod"
  on public.lesson_comments for delete
  to authenticated
  using (author_id = auth.uid() or public.is_moderator());

-- resources ------------------------------------------------------------------
alter table public.resources enable row level security;

create policy "resources_select_all"
  on public.resources for select
  to authenticated
  using (true);

create policy "resources_mod_write"
  on public.resources for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- apps -----------------------------------------------------------------------
alter table public.apps enable row level security;

create policy "apps_select_all"
  on public.apps for select
  to authenticated
  using (true);

create policy "apps_admin_write"
  on public.apps for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());

-- events ---------------------------------------------------------------------
alter table public.events enable row level security;

create policy "events_select_all"
  on public.events for select
  to authenticated
  using (true);

create policy "events_mod_write"
  on public.events for all
  to authenticated
  using (public.is_moderator())
  with check (public.is_moderator());

-- event_attendees ------------------------------------------------------------
alter table public.event_attendees enable row level security;

create policy "attendees_select_all"
  on public.event_attendees for select
  to authenticated
  using (true);

create policy "attendees_insert_own"
  on public.event_attendees for insert
  to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "attendees_update_own"
  on public.event_attendees for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

create policy "attendees_delete_own"
  on public.event_attendees for delete
  to authenticated
  using (user_id = auth.uid());

-- points_ledger --------------------------------------------------------------
alter table public.points_ledger enable row level security;

create policy "points_select_own_or_mod"
  on public.points_ledger for select
  to authenticated
  using (user_id = auth.uid() or public.is_moderator());

-- (sem insert direto — sempre via função award_points security definer)

-- notifications --------------------------------------------------------------
alter table public.notifications enable row level security;

create policy "notifications_select_own"
  on public.notifications for select
  to authenticated
  using (user_id = auth.uid());

create policy "notifications_update_own"
  on public.notifications for update
  to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

-- settings -------------------------------------------------------------------
alter table public.settings enable row level security;

create policy "settings_select_all"
  on public.settings for select
  to authenticated
  using (true);

create policy "settings_admin_write"
  on public.settings for all
  to authenticated
  using (public.is_admin())
  with check (public.is_admin());
