-- =============================================================================
-- 0039 — Pontos de cadastro SÓ após a confirmação de e-mail
--
-- Incidente 2026-07-10: o handle_new_user concedia 10 pontos no INSERT em
-- auth.users, ANTES de confirmar o e-mail. Bots de signup ganhavam pontos e
-- entravam no ranking sem nunca confirmar nada.
--
-- Agora os 10 pontos são concedidos QUANDO o e-mail está confirmado:
--   - usuário real (confirmação ON): 0 pts no INSERT; +10 ao confirmar (UPDATE);
--   - admin.createUser({email_confirm:true}) / signup local (confirmação OFF):
--     o e-mail já nasce confirmado no INSERT → +10 imediato.
-- Idempotente pela unique do ledger — confirmar duas vezes não dobra pontos.
-- =============================================================================

-- 1. Concessão idempotente e server-autoritativa ------------------------------
create or replace function public.award_signup_points(p_user uuid)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_inserted int;
begin
  insert into public.points_ledger (user_id, action, points, reference_type, reference_id)
  values (p_user, 'signup', 10, 'signup', p_user)
  on conflict (user_id, action, reference_type, reference_id) do nothing;
  get diagnostics v_inserted = row_count;
  -- Só incrementa o saldo se a linha do ledger foi de fato criada (evita dobrar).
  if v_inserted = 1 then
    update public.profiles
      set points = points + 10, level = public.recalc_level(points + 10)
      where id = p_user;
  end if;
end;
$$;

-- Nunca chamável direto (RPC): só os triggers a invocam, como definer. Mesmo
-- princípio do lockdown de award_points (0031).
revoke all on function public.award_signup_points(uuid) from public, anon, authenticated;

-- 2. handle_new_user: perfil nasce com 0 pontos; pontua só se já confirmado ----
create or replace function public.handle_new_user()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.profiles (id, full_name, username, avatar_url, points, level)
  values (
    new.id,
    coalesce(new.raw_user_meta_data->>'full_name', split_part(new.email, '@', 1)),
    coalesce(new.raw_user_meta_data->>'username', split_part(new.email, '@', 1) || '_' || substr(new.id::text, 1, 6)),
    new.raw_user_meta_data->>'avatar_url',
    0,
    public.recalc_level(0)
  );
  -- E-mail já confirmado no nascimento (admin.createUser / confirmação OFF).
  if new.email_confirmed_at is not null then
    perform public.award_signup_points(new.id);
  end if;
  return new;
end;
$$;

-- 3. Trigger de confirmação: concede na transição null → confirmado -----------
create or replace function public.on_email_confirmed()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  if old.email_confirmed_at is null and new.email_confirmed_at is not null then
    perform public.award_signup_points(new.id);
  end if;
  return new;
end;
$$;

drop trigger if exists on_auth_user_confirmed on auth.users;
create trigger on_auth_user_confirmed
  after update of email_confirmed_at on auth.users
  for each row execute function public.on_email_confirmed();
