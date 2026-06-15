-- =============================================================================
-- 0011 — Fase 4B-1: links de redes sociais no perfil
-- Coluna jsonb única ({instagram,tiktok,linkedin,github,youtube}) + extensão do
-- GRANT da Fase 1 (0009) para o usuário poder gravar a coluna.
-- Idempotente. ⚠️ Aplicar ANTES de subir o código que grava social_links.
-- =============================================================================

alter table public.profiles
  add column if not exists social_links jsonb not null default '{}'::jsonb;

-- Sem a linha abaixo o usuário (papel `authenticated`) NÃO consegue gravar a
-- coluna — a Fase 1 (0009) revogou UPDATE amplo e só liberou colunas de vitrine.
grant update (social_links) on public.profiles to authenticated;
