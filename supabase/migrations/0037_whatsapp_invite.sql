-- =============================================================================
-- 0037 — FEATURE: convite inteligente para o grupo do WhatsApp.
--
-- Estado do convite POR MEMBRO, em member_onboarding (aditivo — evita tabela
-- generica nova). O convite aparece so apos onboarding concluido (completed_at)
-- e respeita cooldown/limite de exibicoes. Dois estados de "entrou" separados
-- desde ja: joined_CLAIMED (auto-declarado) vs. um futuro joined_verified
-- (sincronizacao oficial) — nao misturar.
--
-- Aditiva e idempotente. NAO mexe em RLS: a policy member_onboarding_update_own
-- (0028) ja cobre estas colunas (o proprio membro atualiza a propria linha).
-- Forjar estes campos afeta apenas o proprio popup/analytics — baixo risco.
--
-- Rollback:
--   alter table public.member_onboarding
--     drop column if exists whatsapp_invite_first_shown_at,
--     drop column if exists whatsapp_invite_last_shown_at,
--     drop column if exists whatsapp_invite_show_count,
--     drop column if exists whatsapp_invite_clicked_at,
--     drop column if exists whatsapp_joined_claimed_at,
--     drop column if exists whatsapp_invite_dismissed_at;
-- =============================================================================

alter table public.member_onboarding
  add column if not exists whatsapp_invite_first_shown_at timestamptz,
  add column if not exists whatsapp_invite_last_shown_at  timestamptz,
  add column if not exists whatsapp_invite_show_count      integer not null default 0,
  add column if not exists whatsapp_invite_clicked_at      timestamptz,
  add column if not exists whatsapp_joined_claimed_at      timestamptz,
  add column if not exists whatsapp_invite_dismissed_at    timestamptz;

-- Registro ATOMICO de exibicao: UPDATE unico (sem read-modify-write no app, que
-- poderia incrementar 2x em chamadas concorrentes/StrictMode). O debounce de 1h
-- vive no WHERE. SECURITY INVOKER: a RLS member_onboarding_update_own (0028) +
-- user_id = auth.uid() garantem que so a propria linha e tocada.
create or replace function public.record_whatsapp_invite_shown()
returns void
language sql
security invoker
set search_path = public
as $$
  update public.member_onboarding
     set whatsapp_invite_show_count      = whatsapp_invite_show_count + 1,
         whatsapp_invite_first_shown_at  = coalesce(whatsapp_invite_first_shown_at, now()),
         whatsapp_invite_last_shown_at   = now()
   where user_id = auth.uid()
     and (
       whatsapp_invite_last_shown_at is null
       or whatsapp_invite_last_shown_at < now() - interval '1 hour'
     );
$$;

revoke all on function public.record_whatsapp_invite_shown() from public;
grant execute on function public.record_whatsapp_invite_shown() to authenticated;
