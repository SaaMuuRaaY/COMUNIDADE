-- =============================================================================
-- 0036 — FEATURE: camada de videos externos (YouTube) na Biblioteca.
--
-- `resources` nao tinha external_url nem resource_type (auditado em 2026-07-08).
-- Adiciona UMA coluna nullable: o recurso e "video" quando video_url nao e nulo
-- (tipo DERIVADO — evita estado redundante do tipo type='video' com url vazia).
--
-- Aditiva e idempotente. Nao mexe em RLS: as policies de `resources`
-- (select p/ autenticado, write admin-only, 0006/0018) ja cobrem colunas novas.
--
-- Rollback: alter table public.resources drop column if exists video_url;
-- =============================================================================

alter table public.resources
  add column if not exists video_url text;

comment on column public.resources.video_url is
  'URL do YouTube. O recurso e "video" quando esta coluna nao e nula (tipo derivado).';
