-- =============================================================================
-- 0042 — Upload de mídia de post é só de moderador/admin
--
-- Regra de produto: membro comum publica só texto; imagem/vídeo em post são de
-- moderador/admin. Defesa em profundidade — a UI (post-composer) esconde os campos
-- e o createPostAction barra media_url/attachment_url de não-moderador; esta é a
-- terceira camada, no storage: o bucket post-media só aceita upload de moderador.
--
-- post-media é usado SÓ por imagem de post (post-image-field). Avatares usam o
-- bucket `avatars`; capas usam `content-covers`/`course-covers` — nenhum afetado.
-- =============================================================================

drop policy if exists "post_media_auth_insert" on storage.objects;
create policy "post_media_auth_insert"
  on storage.objects for insert
  to authenticated
  with check (
    bucket_id = 'post-media'
    and public.is_not_banned()
    and public.is_moderator()
    and (storage.foldername(name))[1] = auth.uid()::text
  );
