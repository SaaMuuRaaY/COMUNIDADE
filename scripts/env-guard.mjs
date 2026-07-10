import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

/**
 * Mesma guarda de `src/lib/env-isolation.ts`, para os scripts `.mjs` (que não
 * importam TypeScript). O ref vem do MESMO arquivo JSON — nenhuma cópia da
 * constante, nenhum risco de as duas divergirem.
 */
const HERE = path.dirname(fileURLToPath(import.meta.url));
const REF_FILE = path.join(HERE, "..", "src", "lib", "production-supabase-ref.json");

export const PRODUCTION_PROJECT_REF = JSON.parse(fs.readFileSync(REF_FILE, "utf8")).ref;

const APP_ENVS = ["local", "test", "preview", "production"];

export function projectRefOf(url) {
  let host;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`[env-isolation] NEXT_PUBLIC_SUPABASE_URL não é uma URL válida: "${url}"`);
  }
  if (host === "127.0.0.1" || host === "localhost") return "local";
  if (!host.endsWith(".supabase.co")) {
    throw new Error(`[env-isolation] não foi possível derivar o project ref de "${host}"`);
  }
  const ref = host.slice(0, -".supabase.co".length);
  if (!ref) throw new Error(`[env-isolation] project ref vazio em "${host}"`);
  return ref;
}

export function assertEnvIsolation() {
  const appEnv = process.env.APP_ENV;
  if (!appEnv) throw new Error("[env-isolation] APP_ENV não definido. Use: local | test | preview | production.");
  if (!APP_ENVS.includes(appEnv)) throw new Error(`[env-isolation] APP_ENV inválido: "${appEnv}".`);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("[env-isolation] NEXT_PUBLIC_SUPABASE_URL ausente.");

  const ref = projectRefOf(url);
  if (appEnv !== "production" && ref === PRODUCTION_PROJECT_REF) {
    throw new Error(`SECURITY: ambiente não produtivo conectado ao Supabase de produção (APP_ENV="${appEnv}").`);
  }
  if (appEnv === "production" && ref !== PRODUCTION_PROJECT_REF) {
    throw new Error(`SECURITY: produção conectada ao projeto Supabase incorreto (ref="${ref}").`);
  }
  return { appEnv, ref };
}
