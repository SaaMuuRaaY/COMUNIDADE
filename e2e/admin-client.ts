import path from "node:path";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";
import { assertEnvIsolation } from "../src/lib/env-isolation";
import { loadTestEnv } from "./load-test-env";

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase com service_role para setup/teardown dos testes E2E.
 *
 * NÃO carrega `.env.local` (foi assim que a suíte escreveu em produção no
 * incidente de 2026-07-10). Carrega `.env.test`, e a guarda derruba o processo
 * antes de qualquer chamada de rede se o projeto não for o esperado.
 */
export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  loadTestEnv(path.join(__dirname, ".."));

  const { appEnv, ref } = assertEnvIsolation();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "E2E: faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.test — necessários para criar usuários de teste.",
    );
  }
  console.log(`[e2e] APP_ENV=${appEnv} projeto=${ref}`);

  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
