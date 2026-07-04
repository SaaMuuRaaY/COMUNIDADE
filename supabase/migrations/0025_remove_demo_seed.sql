-- =============================================================================
-- 0025 — Neutraliza o backdoor demo (SEC-02).
-- O seed cria 5 usuarios demo (senha PUBLICA 'codex123!', UUIDs FIXOS), sendo
-- admin@codex.community um admin real. Esta migration REMOVE esses usuarios +
-- o conteudo demo deterministico (por UUID fixo do seed), preservando a
-- comunidade unica da app e os settings.
--
-- Cascades: auth.users -> profiles -> posts/comentarios/likes/reacoes/salvos/
-- chat/dm/follows/friendships/notifications/community_members/pontos.
-- courses/resources/apps/events tem created_by ON DELETE SET NULL (nao cascateiam)
-- -> removidos explicitamente ANTES de apagar os usuarios.
--
-- GUARDA: so age se existir um admin/owner REAL (nao-demo) — nao deixa a
-- comunidade sem admin. Idempotente + transacional (rollback total em erro).
-- =============================================================================

do $$
declare
  demo_users uuid[] := array[
    '11111111-1111-1111-1111-111111111111',
    '22222222-2222-2222-2222-222222222222',
    '33333333-3333-3333-3333-333333333333',
    '44444444-4444-4444-4444-444444444444',
    '55555555-5555-5555-5555-555555555555'
  ];
  demo_courses uuid[] := array[
    'cccccccc-cccc-cccc-cccc-ccccccccccc1',
    'cccccccc-cccc-cccc-cccc-ccccccccccc2'
  ];
  v_real_admins int;
begin
  -- Nada a fazer se os demos nem existem (ex.: reset local ANTES do seed rodar).
  if not exists (select 1 from auth.users where id = any(demo_users)) then
    return;
  end if;

  -- Guarda: exige um admin/owner real (nao-demo) para nao travar a comunidade.
  select count(*) into v_real_admins
  from public.profiles
  where (role = 'admin' or is_owner = true) and id <> all(demo_users);

  if v_real_admins < 1 then
    raise warning 'SEC-02 (0025): NADA removido — nenhum admin/owner REAL (nao-demo). Marque um owner real (update public.profiles set is_owner=true, role=''admin'' where id=''<seu-uuid>'') e reaplique.';
    return;
  end if;

  -- Catalogo de amostra demo (created_by e SET NULL -> apagar antes de perder o FK).
  delete from public.resources where created_by = any(demo_users);
  delete from public.apps where created_by = any(demo_users);
  delete from public.events where created_by = any(demo_users);

  -- Cursos demo (UUID fixo) -> cascateia course_modules + lessons.
  delete from public.courses where id = any(demo_courses);

  -- Usuarios demo -> cascateia perfil + posts/social/pontos.
  delete from auth.users where id = any(demo_users);

  raise notice 'SEC-02 (0025): backdoor demo neutralizado (usuarios + conteudo demo removidos).';
end $$;
