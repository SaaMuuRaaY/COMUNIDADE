import fs from "node:fs";
import path from "node:path";
import { getAdminClient } from "./admin-client";
import { RUNTIME_DIR } from "./fixtures";

/**
 * `settings` é uma tabela GLOBAL. Semeamos as chaves do vídeo no global setup
 * (antes de qualquer request popular o cache de `getSettings()`) e restauramos no
 * teardown. `workers: 1` garante que nada roda em paralelo.
 *
 * Incidente de 2026-07-10: o seed lia os valores ATUAIS e os gravava como
 * "original". Quando um teardown falhava, a execução seguinte promovia os valores
 * do TESTE a backup, e toda restauração posterior reafirmava a contaminação.
 * Agora, um backup pendente ABORTA a suíte em vez de ser sobrescrito.
 */
const BACKUP_FILE = path.join(RUNTIME_DIR, "settings-backup.json");

export const WELCOME_VIDEO_KEYS = [
  "welcome_video.enabled",
  "welcome_video.url",
  "welcome_video.title",
] as const;

/** Vídeo estável e público, só para o E2E exercitar o passo (usamos o fallback manual). */
export const E2E_VIDEO_URL = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const E2E_VIDEO_TITLE = "Boas-vindas (E2E)";

type Backup = { key: string; value: unknown; existed: boolean }[];

export async function seedWelcomeVideoSettings(): Promise<void> {
  if (fs.existsSync(BACKUP_FILE)) {
    throw new Error(
      `E2E: ${BACKUP_FILE} existe — o teardown anterior não restaurou as settings. ` +
        `Restaure manualmente antes de rodar, senão os valores do teste viram o "original".`,
    );
  }

  const admin = getAdminClient();
  const { data, error } = await admin.from("settings").select("key, value").in("key", [...WELCOME_VIDEO_KEYS]);
  if (error) throw new Error(`E2E: leitura de welcome_video falhou: ${error.message}`);
  const present = new Map((data ?? []).map((r) => [r.key as string, r.value]));

  // Se o que está no banco já é o valor do teste, ele NÃO é um original válido.
  if (present.get("welcome_video.title") === E2E_VIDEO_TITLE) {
    throw new Error(
      "E2E: as settings já contêm os valores do teste — uma execução anterior não restaurou. Corrija antes de rodar.",
    );
  }

  const backup: Backup = WELCOME_VIDEO_KEYS.map((key) => ({
    key,
    value: present.get(key) ?? null,
    existed: present.has(key),
  }));
  fs.mkdirSync(RUNTIME_DIR, { recursive: true });
  fs.writeFileSync(BACKUP_FILE, JSON.stringify(backup, null, 2));

  const now = new Date().toISOString();
  const { error: upErr } = await admin.from("settings").upsert(
    [
      { key: "welcome_video.enabled", value: true, updated_at: now },
      { key: "welcome_video.url", value: E2E_VIDEO_URL, updated_at: now },
      { key: "welcome_video.title", value: E2E_VIDEO_TITLE, updated_at: now },
    ],
    { onConflict: "key" },
  );
  if (upErr) throw new Error(`E2E: seed de welcome_video falhou: ${upErr.message}`);
}

/** Lança se qualquer chave não voltar ao original — o teardown transforma isso em falha da suíte. */
export async function restoreWelcomeVideoSettings(): Promise<void> {
  if (!fs.existsSync(BACKUP_FILE)) return;
  const backup = JSON.parse(fs.readFileSync(BACKUP_FILE, "utf8")) as Backup;
  const admin = getAdminClient();
  const now = new Date().toISOString();
  const failures: string[] = [];

  for (const row of backup) {
    const { error } = row.existed
      ? await admin.from("settings").upsert({ key: row.key, value: row.value, updated_at: now }, { onConflict: "key" })
      : await admin.from("settings").delete().eq("key", row.key);
    if (error) failures.push(`${row.key}: ${error.message}`);
  }

  if (failures.length) {
    // O arquivo PERMANECE: é a prova de que a produção ficou contaminada.
    throw new Error(`restauração de welcome_video falhou:\n  - ${failures.join("\n  - ")}`);
  }
  fs.rmSync(BACKUP_FILE, { force: true });
}
