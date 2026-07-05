-- =============================================================================
-- 0034 — rewards (Feature D F3). Vencedores mensais selecionados MANUALMENTE pelo
-- admin a partir do ranking (sem automacao de entrega). Leitura publica (vitrine
-- em /rewards); escrita so admin (RLS is_admin + action com requireAdmin).
-- =============================================================================

create table public.rewards (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references public.profiles(id) on delete cascade,
  month date not null,                       -- 1o dia do mes (date_trunc('month'))
  rank int not null check (rank between 1 and 3),
  emitted_by uuid references public.profiles(id) on delete set null,
  created_at timestamptz not null default now(),
  unique (month, rank)                        -- 1 vencedor por posicao/mes
);

create index rewards_month_idx on public.rewards (month desc);

alter table public.rewards enable row level security;

create policy "rewards_select_all"
  on public.rewards for select to authenticated using (true);

create policy "rewards_admin_insert"
  on public.rewards for insert to authenticated with check (public.is_admin());

create policy "rewards_admin_delete"
  on public.rewards for delete to authenticated using (public.is_admin());

grant select, insert, delete on public.rewards to authenticated;
