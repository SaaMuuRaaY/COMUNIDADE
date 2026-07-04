-- =============================================================================
-- 0028 — member_onboarding (Feature B F1). Dados do onboarding + aceite de
-- acordos, 1 linha por usuario. NAO bloqueante: a linha e criada sob demanda
-- (UPSERT) quando o usuario preenche; "primeiro acesso" = completed_at IS NULL.
-- Sem IP/User-Agent (privacidade). goals/interests = multipla escolha (text[]).
-- =============================================================================

create table if not exists public.member_onboarding (
  user_id uuid primary key references public.profiles(id) on delete cascade,
  ai_level text,
  goals text[] not null default '{}',
  interests text[] not null default '{}',
  current_project text,
  participation_goal text,
  agreements_version text,
  agreements_accepted_at timestamptz,
  completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

alter table public.member_onboarding enable row level security;

-- Privado: cada um le/gerencia so a propria linha; admin le tudo (moderacao).
create policy "member_onboarding_select_own"
  on public.member_onboarding for select to authenticated
  using (user_id = auth.uid() or public.is_admin());

create policy "member_onboarding_insert_own"
  on public.member_onboarding for insert to authenticated
  with check (user_id = auth.uid() and public.is_not_banned());

create policy "member_onboarding_update_own"
  on public.member_onboarding for update to authenticated
  using (user_id = auth.uid())
  with check (user_id = auth.uid());

grant select, insert, update on public.member_onboarding to authenticated;

create trigger member_onboarding_updated_at
  before update on public.member_onboarding
  for each row execute function public.touch_updated_at();
