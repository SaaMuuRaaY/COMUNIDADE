import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { getAdminClient } from "./admin-client";
import { USERS_FILE, type E2EUsers } from "./fixtures";

function loadUsers(): E2EUsers {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
}

const EMBED_RE = /youtube-nocookie\.com\/embed\//;

test.describe("Biblioteca — recurso em vídeo", () => {
  const stamp = Date.now();
  // Titulos SEM a palavra "Video" — senao getByText("Vídeo") do badge colide
  // com o titulo/descricao e viola o strict mode do Playwright.
  const okSlug = `e2e-yt-${stamp}`;
  const okTitle = `E2E Recurso YT ${stamp}`;
  const badSlug = `e2e-yt-bad-${stamp}`;
  const badTitle = `E2E Recurso YT Ruim ${stamp}`;

  test.beforeAll(async () => {
    const users = loadUsers();
    const admin = getAdminClient();
    const rows = [
      {
        title: okTitle,
        description: "Recurso de teste com player externo.",
        category: "templates",
        video_url: "https://www.youtube.com/watch?v=dQw4w9WgXcQ",
        slug: okSlug,
        created_by: users.admin.id,
      },
      {
        // URL não-YouTube gravada direto no banco (contorna o zod) para provar
        // que o componente degrada para placeholder em vez de iframe de lixo.
        title: badTitle,
        description: "Recurso com URL de vídeo inválida.",
        category: "templates",
        video_url: "https://example.com/not-a-video",
        slug: badSlug,
        created_by: users.admin.id,
      },
    ];
    const { error } = await admin.from("resources").insert(rows);
    if (error) throw new Error(`E2E: seed de recurso-vídeo falhou: ${error.message}`);
  });

  test.afterAll(async () => {
    const admin = getAdminClient();
    await admin.from("resources").delete().in("slug", [okSlug, badSlug]);
  });

  test("watch URL vira embed nocookie na página do recurso", async ({ page }) => {
    await page.goto(`/resources/${okSlug}`);
    const frame = page.locator(`iframe[title="${okTitle}"]`);
    await expect(frame).toBeVisible({ timeout: 20_000 });
    await expect(frame).toHaveAttribute("src", EMBED_RE);
    // O parser extrai o ID e monta /embed/ID — nunca a URL de watch crua.
    await expect(frame).toHaveAttribute("src", /\/embed\/dQw4w9WgXcQ/);
  });

  test("badge de Vídeo aparece na listagem", async ({ page }) => {
    await page.goto("/resources");
    const card = page.locator("div.bg-card").filter({ hasText: okTitle }).first();
    await expect(card.getByText("Vídeo", { exact: true })).toBeVisible({ timeout: 20_000 });
  });

  test("URL inválida degrada para placeholder, sem iframe", async ({ page }) => {
    await page.goto(`/resources/${badSlug}`);
    await expect(page.getByText("Vídeo indisponível.")).toBeVisible({ timeout: 20_000 });
    await expect(page.locator(`iframe[title="${badTitle}"]`)).toHaveCount(0);
  });
});
