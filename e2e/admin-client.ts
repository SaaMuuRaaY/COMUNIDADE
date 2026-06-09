import path from "node:path";
import { loadEnvConfig } from "@next/env";
import { createClient, type SupabaseClient } from "@supabase/supabase-js";

let cached: SupabaseClient | null = null;

/**
 * Cliente Supabase com service_role para setup/teardown dos testes E2E.
 * Carrega .env.local exatamente como o Next faz — as credenciais nunca
 * são impressas em log nem expostas ao agente.
 */
export function getAdminClient(): SupabaseClient {
  if (cached) return cached;
  const projectDir = path.join(__dirname, "..");
  loadEnvConfig(projectDir, true);

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
  if (!url || !key) {
    throw new Error(
      "E2E: faltam NEXT_PUBLIC_SUPABASE_URL e/ou SUPABASE_SERVICE_ROLE_KEY no .env.local — necessários para criar usuários de teste.",
    );
  }
  cached = createClient(url, key, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  return cached;
}
