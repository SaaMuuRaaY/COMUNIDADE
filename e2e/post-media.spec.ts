import { test, expect } from "@playwright/test";
import { MEMBER_CHANNEL, MEMBER_CHANNEL_CTA } from "./fixtures";

const YT_WATCH = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const EMBED_RE = /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/;

test.describe("Composer — vídeo do YouTube e feed geral", () => {
  test("anexar vídeo do YouTube a um post no canal", async ({ page }) => {
    const body = `E2E post-video ${Date.now()}`;
    await page.goto(MEMBER_CHANNEL);
    await page.getByRole("button", { name: MEMBER_CHANNEL_CTA }).click();
    await page.getByLabel("Conteúdo da publicação").fill(body);

    // Cola a URL de watch → o composer valida (isYouTubeUrl) e habilita "Adicionar".
    await page.getByLabel("URL do vídeo do YouTube").fill(YT_WATCH);
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    // Preview do vídeo aparece no composer (imagem e vídeo são mutuamente exclusivos).
    await expect(page.getByRole("button", { name: "Remover vídeo" })).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(MEMBER_CHANNEL)),
      page.getByRole("button", { name: "Publicar", exact: true }).click(),
    ]);
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });

    const card = page.locator("div.bg-card").filter({ hasText: body }).first();
    await expect(card.locator("iframe")).toHaveAttribute("src", EMBED_RE, { timeout: 20_000 });
  });

  test("criar post a partir do feed geral escolhendo o canal", async ({ page }) => {
    const body = `E2E feed-geral ${Date.now()}`;
    await page.goto("/community");
    await page.getByRole("button", { name: "Criar publicação" }).click();

    // Seletor de canal (só aparece no feed geral, onde não há canal fixo).
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Apresente-se" }).click();
    await page.getByLabel("Conteúdo da publicação").fill(body);

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/community")),
      page.getByRole("button", { name: "Publicar", exact: true }).click(),
    ]);
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });

    // Prova de que o canal escolhido virou a category: o post aparece em /apresente-se.
    await page.goto(MEMBER_CHANNEL);
    await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 });
  });
});
