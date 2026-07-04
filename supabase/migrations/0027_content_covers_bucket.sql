-- =============================================================================
-- 0027 — Bucket de capas (Biblioteca 2.0 F2). Capas de recursos e aplicativos.
-- Leitura pública; escrita/remoção por moderador (cobre resources=mod e apps=
-- admin, que é subconjunto de is_moderator para uma imagem de capa). 2MB, image.
-- =============================================================================

insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('content-covers', 'content-covers', true, 2097152,
        array['image/png','image/jpeg','image/webp'])
on conflict (id) do nothing;

create policy "content_covers_public_read"
  on storage.objects for select
  using (bucket_id = 'content-covers');

create policy "content_covers_mod_write"
  on storage.objects for insert to authenticated
  with check (bucket_id = 'content-covers' and public.is_moderator());

create policy "content_covers_mod_update"
  on storage.objects for update to authenticated
  using (bucket_id = 'content-covers' and public.is_moderator());

create policy "content_covers_mod_delete"
  on storage.objects for delete to authenticated
  using (bucket_id = 'content-covers' and public.is_moderator());
