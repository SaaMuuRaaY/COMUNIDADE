import fs from "node:fs";
import path from "node:path";
import { getAdminClient } from "./admin-client";
import { RUNTIME_DIR } from "./fixtures";

/**
 * `settings` é uma tabela GLOBAL compartilhada com a comunidade real, e o app lê
 * via `getSettings()` cacheado (`unstable_cache`). Por isso semeamos as chaves do
 * vídeo no GLOBAL SETUP (antes de qualquer request popular o cache) e restauramos
 * o valor original no teardown. `workers: 1` garante que nada roda em paralelo.
 */
const BACKUP_FILE = path.join(RUNTIME_DIR, "settings-backup.json");

export const WELCOME_VIDEO_KEYS = [
  "welcome_video.enabled",
  "welcome_video.url",
  "welcome_video.title",
] as const;

/** Vídeo estável e público, só para o E2E exercitar o passo (usamos o fallback manual). */
export const E2E_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";

type Backup = { key: string; value: unknown; existed: boolean }[];

export async function seedWelcomeVideoSettings(): Promise<void> {
  const admin = getAdminClient();
  const { data } = await admin.from("settings").select("key, value").in("key", [...WELCOME_VIDEO_KEYS]);
  const present = new Map((data ?? []).map((r) => [r.key as string, r.value]));

  const backup: Backup = WELCOME_VIDEO_KEYS.map((key) => ({
    key,
    value: present.get(key) ?? null,
    existed: present.has(key),
  }));
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));

  const now = new Date().toISOString();
  const { error } = await admin.from("settings").upsert(
    [
      { key: "welcome_video.enabled", value: true, updated_at: now },
      { key: "welcome_video.url", value: E2E_VIDEO_URL, updated_at: now },
      { key: "welcome_video.title", value: "Boas-vindas (E2E)", updated_at: now },
    ],
    { onConflict: "key" },
  );
  if (error) throw new Error(`E2E: seed de welcome_video falhou: ${error.message}`);
}

export async function restoreWelcomeVideoSettings(): Promise<void> {
  if (!fs.existsSync(BACKUP_FILE)) return;
  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")) as Backup;
  const admin = getAdminClient();
  const now = new Date().toISOString();

  for (const row of backup) {
    try {
      if (row.existed) {
        await admin.from("settings").upsert({ key: row.key, value: row.value, updated_at: now }, { onConflict: "key" });
      } else {
        await admin.from("settings").delete().eq("key", row.key);
      }
    } catch (e) {
      console.warn(`[e2e] restauração de ${row.key} falhou:`, (e as Error).message);
    }
  }
  fs.rmSync(BACKUP_FILE, { force: true });
}
