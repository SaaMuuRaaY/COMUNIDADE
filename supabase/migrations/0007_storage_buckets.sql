-- =============================================================================
-- 0007 — Buckets de Storage + Policies
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values
  ('avatars',       'avatars',       true,  5242880,   array['image/png','image/jpeg','image/webp','image/gif']),
  ('post-media',    'post-media',    true,  52428800,  array['image/png','image/jpeg','image/webp','image/gif','video/mp4','video/webm']),
  ('videos',        'videos',        false, 524288000, array['video/mp4','video/webm','video/quicktime']),
  ('resources',     'resources',     false, 104857600, null),
  ('apps',          'apps',          false, 52428800,  null),
  ('course-covers', 'course-covers', true,  10485760,  array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

-- -----------------------------------------------------------------------------
-- avatars — dono escreve, todos lêem
-- -----------------------------------------------------------------------------
create policy "avatars_public_read"
  on storage.objects for select
  using (bucket_id = 'avatars');

create policy "avatars_owner_write"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
    and public.is_not_banned()
  );

create policy "avatars_owner_update"
  on storage.objects for update
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "avatars_owner_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'avatars'
    and (storage.foldername(name))[1] = auth.uid()::text
  );

-- -----------------------------------------------------------------------------
-- post-media — usuário autenticado e não-banido pode subir; só dono apaga
-- -----------------------------------------------------------------------------
create policy "post_media_public_read"
  on storage.objects for select
  using (bucket_id = 'post-media');

create policy "post_media_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and public.is_not_banned()
    and (storage.foldername(name))[1] = auth.uid()::text
  );

create policy "post_media_owner_or_mod_delete"
  on storage.objects for delete
  to authenticated
  using (
    bucket_id = 'post-media'
    and ((storage.foldername(name))[1] = auth.uid()::text or public.is_moderator())
  );

-- -----------------------------------------------------------------------------
-- videos / resources / apps / course-covers — moderador/admin
-- -----------------------------------------------------------------------------
create policy "videos_auth_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'videos');

create policy "videos_mod_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'videos' and public.is_moderator());

create policy "videos_mod_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'videos' and public.is_moderator());

create policy "videos_mod_update"
  on storage.objects for update
  to authenticated
  using (bucket_id = 'videos' and public.is_moderator());

-- resources
create policy "resources_auth_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'resources');

create policy "resources_mod_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'resources' and public.is_moderator());

create policy "resources_mod_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'resources' and public.is_moderator());

-- apps
create policy "apps_auth_read"
  on storage.objects for select
  to authenticated
  using (bucket_id = 'apps');

create policy "apps_admin_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'apps' and public.is_admin());

create policy "apps_admin_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'apps' and public.is_admin());

-- course-covers
create policy "covers_public_read"
  on storage.objects for select
  using (bucket_id = 'course-covers');

create policy "covers_mod_write"
  on storage.objects for insert
  to authenticated
  with check (bucket_id = 'course-covers' and public.is_moderator());

create policy "covers_mod_delete"
  on storage.objects for delete
  to authenticated
  using (bucket_id = 'course-covers' and public.is_moderator());
