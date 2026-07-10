import fs from "node:fs";
import path from "node:path";
import { test, expect } from "@playwright/test";
import { getAdminClient } from "./admin-client";
import { projectRefOf, PRODUCTION_PROJECT_REF } from "../src/lib/env-isolation";

/**
 * Prova de isolamento (F2): o build que será servido ao browser aponta para o
 * projeto LOCAL, nunca produção. É o teste que teria pego o incidente de
 * 2026-07-10 — quando o E2E rodou contra produção.
 *
 * Inspeciona o BUILD NO DISCO (`.next/static`), não a rede nem uma página
 * específica: as `NEXT_PUBLIC_*` são inlinadas como literais nos chunks durante o
 * build. Se o build tivesse usado o env de produção, o ref de produção estaria nos
 * chunks. É determinístico e independe de qual página exercita o client Supabase.
 */
function readAllChunks(): string {
  const dir = path.join(__dirname, "..", ".next", "static");
  const out: string[] = [];
  const walk = (d: string) => {
    for (const entry of fs.readdirSync(d, { withFileTypes: true })) {
      const p = path.join(d, entry.name);
      if (entry.isDirectory()) walk(p);
      else if (entry.name.endsWith(".js")) out.push(fs.readFileSync(p, "utf8"));
    }
  };
  walk(dir);
  return out.join("\n");
}

test.describe("Isolamento de ambiente", () => {
  test("o admin client (harness) aponta para o projeto local, nunca produção", () => {
    const ref = projectRefOf(process.env.NEXT_PUBLIC_SUPABASE_URL!);
    expect(ref).not.toBe(PRODUCTION_PROJECT_REF);
    expect(ref).toBe("local");
    expect(getAdminClient()).toBeTruthy();
  });

  test("nenhum chunk do build contém o ref de produção", () => {
    const bundle = readAllChunks();
    expect(bundle.length, "nenhum chunk .js encontrado em .next/static").toBeGreaterThan(0);
    expect(
      bundle.includes(PRODUCTION_PROJECT_REF),
      "um chunk do browser contém o ref de PRODUÇÃO — build com env errado",
    ).toBe(false);
    expect(
      bundle.includes("127.0.0.1:54321"),
      "nenhum chunk referencia o Supabase local — build com env errado",
    ).toBe(true);
  });
});
