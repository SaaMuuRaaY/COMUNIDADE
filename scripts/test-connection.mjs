/**
 * Smoke-test de conexão com Supabase usando as variáveis do .env.local.
 * Rode com:  node --env-file=.env.local scripts/test-connection.mjs
 */
import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anon = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = process.env.SUPABASE_SERVICE_ROLE_KEY;

console.log("\n=== ENV ===");
console.log("URL:           ", url ?? "❌ AUSENTE");
console.log("ANON length:   ", anon?.length ?? "❌ AUSENTE");
console.log("SERVICE length:", service?.length ?? "❌ AUSENTE");

if (!url || !anon) {
  console.error("\n❌ Variáveis ausentes. Abortando.");
  process.exit(1);
}

console.log("\n=== 1. Auth (anon → /auth/v1/health) ===");
try {
  const r = await fetch(`${url}/auth/v1/health`, { headers: { apikey: anon } });
  console.log("HTTP", r.status, r.ok ? "✓" : "✗");
  if (!r.ok) console.log(await r.text());
} catch (e) {
  console.error("❌ fetch falhou:", e.message);
}

console.log("\n=== 2. Login real (admin@codex.community / codex123!) ===");
const supa = createClient(url, anon);
try {
  const { data, error } = await supa.auth.signInWithPassword({
    email: "admin@codex.community",
    password: "codex123!",
  });
  if (error) {
    console.error("❌ login falhou:", error.message, error.status ?? "");
  } else {
    console.log("✓ login OK | user:", data.user?.email, "| id:", data.user?.id);
  }
} catch (e) {
  console.error("❌ exception:", e.message);
}

console.log("\n=== 3. Query (rest /rest/v1/profiles) ===");
try {
  const r = await fetch(`${url}/rest/v1/profiles?select=id,full_name,role&limit=5`, {
    headers: { apikey: anon, Authorization: `Bearer ${anon}` },
  });
  console.log("HTTP", r.status);
  console.log(await r.text());
} catch (e) {
  console.error("❌", e.message);
}
