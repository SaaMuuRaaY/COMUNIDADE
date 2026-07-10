/**
 * Contagem READ-ONLY do impacto da F9 (pré-deploy). NÃO escreve nada.
 *
 * Responde: quantos membros receberão o tour automaticamente ao abrir
 * /comece-por-aqui — ou seja, os que já têm formulário + apresentação
 * (essenciais, exceto vídeo) e ainda não têm `journey_completed_at`.
 *
 * Uso: node scripts/journey-impact-count.mjs
 */
import fs from "node:fs";
import { createClient } from "@supabase/supabase-js";

// Parse mínimo de .env.local (sem dependência; nenhum valor é impresso).
for (const file of [".env.local", ".env"]) {
  if (!fs.existsSync(file)) continue;
  for (const line of fs.readFileSync(file, "utf8").split("\n")) {
    const m = line.match(/^\s*([A-Z0-9_]+)\s*=\s*(.*)\s*$/i);
    if (m && !process.env[m[1]]) process.env[m[1]] = m[2].replace(/^["']|["']$/g, "");
  }
}

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const key = process.env.SUPABASE_SERVICE_ROLE_KEY;
if (!url || !key) throw new Error("Faltam NEXT_PUBLIC_SUPABASE_URL / SUPABASE_SERVICE_ROLE_KEY.");

const db = createClient(url, key, { auth: { persistSession: false } });

const count = async (label, build) => {
  const { count: n, error } = await build(db.from("member_onboarding").select("*", { count: "exact", head: true }));
  if (error) throw new Error(`${label}: ${error.message}`);
  return [label, n ?? 0];
};

const rows = await Promise.all([
  count("membros com linha em member_onboarding", (q) => q),
  count("grandfathered (dispensados da jornada)", (q) => q.not("grandfathered_at", "is", null)),
  count("formulário concluído (completed_at)", (q) => q.not("completed_at", "is", null)),
  count("apresentação concluída (introduction_completed_at)", (q) => q.not("introduction_completed_at", "is", null)),
  count("vídeo assistido (welcome_video_completed_at)", (q) => q.not("welcome_video_completed_at", "is", null)),
  count("journey_completed_at nulo", (q) => q.is("journey_completed_at", null)),
  // O grupo que realmente verá o tour ao abrir /comece-por-aqui:
  count("→ RECEBERÃO O TOUR (form + apresentação, sem journey, não grandfathered)", (q) =>
    q
      .is("grandfathered_at", null)
      .is("journey_completed_at", null)
      .not("completed_at", "is", null)
      .not("introduction_completed_at", "is", null),
  ),
]);

const { count: profiles } = await db.from("profiles").select("*", { count: "exact", head: true });
console.log(`\nperfis totais: ${profiles ?? 0}`);
for (const [label, n] of rows) console.log(`${String(n).padStart(6)}  ${label}`);
console.log("");
