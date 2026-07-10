import fs from "node:fs";
import path from "node:path";

/**
 * Carrega `.env.test` — e SÓ ele. Nunca `.env.local`.
 *
 * O incidente de 2026-07-10 aconteceu porque o E2E usava `loadEnvConfig` do Next,
 * que resolve `.env.local` (produção). Variáveis já presentes no processo têm
 * precedência, para o CI poder injetar as suas.
 */
export function loadTestEnv(projectDir: string): void {
  const file = path.join(projectDir, ".env.test");
  if (!fs.existsSync(file)) {
    throw new Error(
      `E2E: ${file} não existe. Copie .env.test.example e aponte para o Supabase local (supabase start).`,
    );
  }
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Za-z0-9_]+)\s*=\s*(.*?)\s*$/);
    if (!m) continue;
    const [, key, raw] = m;
    if (process.env[key] !== undefined) continue;
    process.env[key] = raw.replace(/^["']|["']$/g, "");
  }
}
