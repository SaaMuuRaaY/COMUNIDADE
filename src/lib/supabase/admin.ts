import "server-only";
import { createClient as createSupabaseClient } from "@supabase/supabase-js";
import { assertEnvIsolation } from "@/lib/env-isolation";
import type { Database } from "@/types/db";

export function createAdminClient() {
  // service_role é a chave que ignora RLS: a guarda roda antes de qualquer rede.
  assertEnvIsolation();

  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const serviceKey = process.env.SUPABASE_SERVICE_ROLE_KEY;

  if (!url || !serviceKey) {
    throw new Error("Supabase admin client requer NEXT_PUBLIC_SUPABASE_URL e SUPABASE_SERVICE_ROLE_KEY.");
  }

  return createSupabaseClient<Database>(url, serviceKey, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
