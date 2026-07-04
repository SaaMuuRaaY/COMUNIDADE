-- =============================================================================
-- 0031 — award_points lockdown (P0/SEC-X2). A funcao award_points e SECURITY
-- DEFINER e estava executavel por PUBLIC: qualquer usuario autenticado podia
-- chama-la direto via PostgREST (supabase.rpc('award_points', {...})) e se
-- auto-premiar pontos arbitrarios.
--
-- Quem PRECISA chamar continua funcionando:
--  - o servidor, via client service-role (src/lib/points/award.ts) -> service_role;
--  - os triggers internos (handle_like_award etc.), que rodam em contexto
--    SECURITY DEFINER/owner e NAO dependem de grant de papel de request.
--
-- Revoga de todos os papeis de request e mantem apenas service_role.
-- =============================================================================

revoke execute on function public.award_points(uuid, text, integer, text, uuid) from public;
revoke execute on function public.award_points(uuid, text, integer, text, uuid) from anon;
revoke execute on function public.award_points(uuid, text, integer, text, uuid) from authenticated;
grant  execute on function public.award_points(uuid, text, integer, text, uuid) to service_role;
