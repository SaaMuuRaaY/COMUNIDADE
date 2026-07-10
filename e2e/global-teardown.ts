import fs from "node:fs";
import { getAdminClient } from "./admin-client";
import { USERS_FILE, type E2EUsers } from "./fixtures";
import { restoreWelcomeVideoSettings } from "./settings-backup";

/**
 * Limpeza verificada.
 *
 * No incidente de 2026-07-10 este arquivo imprimia "3 usuários removidos" enquanto
 * deixava os três em produção: `deleteUser` devolve `{ error }` e NÃO lança, o
 * `try/catch` nunca lia o erro, e o log era só `createdIds.length`.
 *
 * Agora: todo erro é lido, a exclusão é CONFIRMADA e qualquer resíduo QUEBRA a
 * suíte. Um teardown que falha e passa é pior que nenhum teardown.
 */

/** Tabelas com FK `on delete set null` — precisam ser apagadas ANTES do usuário. */
const SET_NULL_TABLES = ["courses", "apps", "resources", "events"] as const;
/** Tabelas com FK `on delete cascade` — apagadas por garantia, a cascata cobre o resto. */
const CASCADE_TABLES = [
  { table: "post_comments", column: "author_id" },
  { table: "post_likes", column: "user_id" },
  { table: "posts", column: "author_id" },
  { table: "lesson_progress", column: "user_id" },
  { table: "event_attendees", column: "user_id" },
] as const;

export default async function globalTeardown() {
  const failures: string[] = [];

  try {
    await restoreWelcomeVideoSettings();
  } catch (e) {
    failures.push(`restauração de settings: ${(e as Error).message}`);
  }

  if (!fs.existsSync(USERS_FILE)) {
    if (failures.length) throw new Error(`[e2e] teardown falhou:\n  - ${failures.join("\n  - ")}`);
    return;
  }

  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
  const admin = getAdminClient();
  let removed = 0;

  for (const id of users.createdIds) {
    for (const { table, column } of CASCADE_TABLES) {
      const { error } = await admin.from(table).delete().eq(column, id);
      if (error) failures.push(`${table} de ${id}: ${error.message}`);
    }
    for (const table of SET_NULL_TABLES) {
      const { error } = await admin.from(table).delete().eq("created_by", id);
      if (error) failures.push(`${table} de ${id}: ${error.message}`);
    }

    const { error: delErr } = await admin.auth.admin.deleteUser(id);
    if (delErr) {
      failures.push(`deleteUser(${id}): ${delErr.message}`);
      continue;
    }

    // `deleteUser` pode devolver sucesso e não remover. Confirmamos.
    const { data: still } = await admin.auth.admin.getUserById(id);
    if (still?.user) {
      failures.push(`usuário ${id} ainda existe após deleteUser`);
      continue;
    }
    removed++;
  }

  fs.rmSync(USERS_FILE, { force: true });

  if (failures.length) {
    throw new Error(
      `[e2e] teardown NÃO limpou tudo (${removed}/${users.createdIds.length} usuários removidos):\n  - ${failures.join("\n  - ")}`,
    );
  }
  console.log(`[e2e] teardown verificado: ${removed}/${users.createdIds.length} usuários removidos.`);
}
