import fs from "node:fs";
import { getAdminClient } from "./admin-client";
import { USERS_FILE, type E2EUsers } from "./fixtures";
import { restoreWelcomeVideoSettings } from "./settings-backup";

export default async function globalTeardown() {
  // Devolve as chaves de welcome_video ao valor original da comunidade.
  await restoreWelcomeVideoSettings();

  if (!fs.existsSync(USERS_FILE)) return;
  const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
  const admin = getAdminClient();

  for (const id of users.createdIds) {
    // Limpa conteúdo gerado pelos testes antes de remover o usuário.
    try {
      await admin.from("post_comments").delete().eq("author_id", id);
      await admin.from("post_likes").delete().eq("user_id", id);
      await admin.from("posts").delete().eq("author_id", id);
      await admin.from("lesson_progress").delete().eq("user_id", id);
      await admin.from("event_attendees").delete().eq("user_id", id);
      // Cursos/apps/recursos/eventos criados pelo admin de teste (cascade cobre módulos/aulas).
      await admin.from("courses").delete().eq("created_by", id);
      await admin.from("apps").delete().eq("created_by", id);
      await admin.from("resources").delete().eq("created_by", id);
      await admin.from("events").delete().eq("created_by", id);
    } catch (e) {
      console.warn(`[e2e] limpeza de conteúdo falhou para ${id}:`, (e as Error).message);
    }
    try {
      await admin.auth.admin.deleteUser(id);
    } catch (e) {
      console.warn(`[e2e] remoção do usuário ${id} falhou:`, (e as Error).message);
    }
  }
  console.log(`[e2e] teardown concluído: ${users.createdIds.length} usuários removidos.`);
}
