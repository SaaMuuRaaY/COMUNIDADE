#!/usr/bin/env node
/*
 * verify-fase1.mjs — Validação LOCAL da Fase 1 (Produção Segura).
 *
 * O QUE FAZ:  roda os checks locais (typecheck, lint, build) e imprime o
 *             checklist de verificação PÓS-MIGRATION para você executar
 *             MANUALMENTE no Supabase SQL Editor.
 *
 * O QUE NÃO FAZ (por segurança):
 *   - NÃO conecta na cloud / Supabase.
 *   - NÃO lê secrets nem variáveis de ambiente.
 *   - NÃO executa nenhum SQL.
 *   - NÃO faz commit, push nem deploy.
 *
 * Uso:  node scripts/verify-fase1.mjs
 */
import { execSync } from "node:child_process";

const LOCAL_CHECKS = [
  ["typecheck", "pnpm typecheck"],
  ["lint", "pnpm lint"],
  ["build", "pnpm build"],
];

let failed = false;
for (const [name, cmd] of LOCAL_CHECKS) {
  process.stdout.write(`\n========== ${name.toUpperCase()} (${cmd}) ==========\n`);
  try {
    execSync(cmd, { stdio: "inherit" });
    process.stdout.write(`\n[OK] ${name}\n`);
  } catch {
    failed = true;
    process.stdout.write(`\n[FALHOU] ${name}\n`);
  }
}

process.stdout.write(`\n${"=".repeat(72)}\n`);
process.stdout.write(failed
  ? "RESULTADO LOCAL: ALGUM CHECK FALHOU — corrija antes de commitar/deploy.\n"
  : "RESULTADO LOCAL: typecheck + lint + build OK.\n");
process.stdout.write("=".repeat(72) + "\n");

process.stdout.write(`
CHECKLIST PÓS-MIGRATION (MANUAL — Supabase SQL Editor; NADA é executado por este script)
Pré-requisito: BACKUP feito e migrations 0009/0010 aplicadas. Detalhes: docs/FASE_1_PRODUCAO_SEGURA.md

[ ] Estrutura criada (0009):
    select column_name from information_schema.columns
    where table_schema='public' and table_name='profiles' and column_name='is_owner';
    select proname from pg_proc where proname in ('admin_set_role','admin_set_banned','is_owner');

[ ] Grant de coluna aplicado (authenticated só deve ter UPDATE nas 4 colunas de vitrine):
    select column_name from information_schema.column_privileges
    where table_name='profiles' and grantee='authenticated' and privilege_type='UPDATE';
    -- esperado: full_name, username, bio, avatar_url

[ ] Policies de conteúdo atualizadas (0010):
    select policyname from pg_policies where tablename in ('lessons','course_modules');
    -- esperado: lessons_select_published_or_mod, modules_select_published_or_mod

[ ] Owner único:
    select count(*) as owners from public.profiles where is_owner;   -- deve ser 1

[ ] Testes de comportamento (ver docs/FASE_1_PRODUCAO_SEGURA.md §9.2):
    - membro comum NÃO altera points/level/role/is_banned (deve falhar);
    - membro comum ALTERA full_name (deve OK);
    - admin_set_role no único admin -> erro "ultimo admin";
    - admin comum NÃO rebaixa/bane owner;
    - award_points credita pontos normalmente;
    - membro comum NÃO lê aula de curso draft; moderator/admin lê.

Lembrete: SEC-02 (demos), marcação do owner e config de Auth/SMTP continuam MANUAIS.
`);

process.exit(failed ? 1 : 0);
