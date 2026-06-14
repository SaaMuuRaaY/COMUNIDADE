-- =============================================================================
-- 0009 — Fase 1 Produção Segura
-- SEC-01: blindar colunas sensíveis de profiles (auto-unban / fraude de pontos)
-- SEC-05: gestão de role/ban via RPC transacional (race do último admin)
-- Owner absoluto: flag is_owner (ortogonal a role='admin')
-- Idempotente: pode ser reaplicada com segurança.
-- =============================================================================

-- 1) OWNER ABSOLUTO -----------------------------------------------------------
alter table public.profiles add column if not exists is_owner boolean not null default false;

-- No máximo 1 owner ativo (índice único parcial sobre constante).
create unique index if not exists profiles_single_owner_idx
  on public.profiles ((true)) where is_owner;

create or replace function public.is_owner()
returns boolean
language sql
stable
security definer
set search_path = public
as $$
  select exists(
    select 1 from public.profiles
    where id = auth.uid() and is_owner = true and is_banned = false
  );
$$;

-- 2) SEC-01: travar colunas sensíveis para usuários comuns --------------------
-- O usuário (papel `authenticated`) só pode atualizar colunas de vitrine do
-- próprio perfil. role / is_banned / points / level / is_owner deixam de ser
-- graváveis via PostgREST direto (a RLS por linha não filtra coluna).
revoke update on public.profiles from authenticated;
grant update (full_name, username, bio, avatar_url) on public.profiles to authenticated;
-- award_points() e as RPCs admin abaixo são SECURITY DEFINER (executam como dono
-- do objeto) e continuam podendo escrever points/level/role/is_banned.

-- 3) SEC-05 + owner: gestão de role/ban via RPC transacional ------------------
create or replace function public.admin_set_role(p_user uuid, p_role text)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role  text;
  v_target_owner boolean;
  v_admins       int;
begin
  if not public.is_admin() then
    raise exception 'forbidden: requer admin';
  end if;
  if p_role not in ('admin','moderator','member') then
    raise exception 'role invalida';
  end if;

  select role, is_owner into v_target_role, v_target_owner
  from public.profiles where id = p_user for update;
  if not found then
    raise exception 'usuario nao encontrado';
  end if;

  -- Owner é intocável por quem não é owner.
  if v_target_owner and not public.is_owner() then
    raise exception 'somente o owner pode alterar o owner';
  end if;

  -- Não rebaixar o próprio admin (lockout).
  if p_user = auth.uid() and p_role <> 'admin' then
    raise exception 'voce nao pode remover seu proprio acesso de admin';
  end if;

  -- Não remover o último admin (checado sob lock, atômico).
  if v_target_role = 'admin' and p_role <> 'admin' then
    select count(*) into v_admins from public.profiles where role = 'admin';
    if v_admins <= 1 then
      raise exception 'nao e possivel remover o ultimo admin';
    end if;
  end if;

  update public.profiles set role = p_role where id = p_user;
end;
$$;

create or replace function public.admin_set_banned(p_user uuid, p_banned boolean)
returns void
language plpgsql
security definer
set search_path = public
as $$
declare
  v_target_role  text;
  v_target_owner boolean;
begin
  if not public.is_admin() then
    raise exception 'forbidden: requer admin';
  end if;
  if p_user = auth.uid() then
    raise exception 'voce nao pode banir a si mesmo';
  end if;

  select role, is_owner into v_target_role, v_target_owner
  from public.profiles where id = p_user for update;
  if not found then
    raise exception 'usuario nao encontrado';
  end if;

  -- Owner nunca pode ser banido.
  if v_target_owner then
    raise exception 'o owner nao pode ser banido';
  end if;
  -- Admin só pode ser banido pelo owner.
  if p_banned and v_target_role = 'admin' and not public.is_owner() then
    raise exception 'somente o owner pode banir um admin';
  end if;

  update public.profiles set is_banned = p_banned where id = p_user;
end;
$$;

revoke all on function public.admin_set_role(uuid, text)    from public;
revoke all on function public.admin_set_banned(uuid, boolean) from public;
grant execute on function public.admin_set_role(uuid, text)    to authenticated;
grant execute on function public.admin_set_banned(uuid, boolean) to authenticated;
