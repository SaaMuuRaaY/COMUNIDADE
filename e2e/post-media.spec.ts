import { test, expect } from "@playwright/test";
import { MEMBER_CHANNEL, MEMBER_CHANNEL_CTA, ADMIN_STATE } from "./fixtures";

const YT_WATCH = "https://www.youtube.com/watch?v=dQw4w9WgXcQ";
const EMBED_RE = /youtube-nocookie\.com\/embed\/dQw4w9WgXcQ/;

// Mídia (imagem/vídeo) em post é privilégio de moderador/admin. Este bloco roda com
// a sessão do ADMIN (override do storageState do projeto member).
test.describe("Composer — mídia é de moderador/admin", () => {
  test.use({ storageState: ADMIN_STATE });

  test("admin anexa vídeo do YouTube a um post no canal", async ({ page }) => {
    const body = `E2E post-video ${Date.now()}`;
    await page.goto(MEMBER_CHANNEL);
    await page.getByRole("button", { name: MEMBER_CHANNEL_CTA }).click();
    await page.getByLabel("Conteúdo da publicação").fill(body);

    await page.getByLabel("URL do vídeo do YouTube").fill(YT_WATCH);
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(page.getByRole("button", { name: "Remover vídeo" })).toBeVisible();

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(MEMBER_CHANNEL)),
      page.getByRole("button", { name: "Publicar", exact: true }).click(),
    ]);
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });

    const card = page.locator("div.bg-card").filter({ hasText: body }).first();
    await expect(card.locator("iframe")).toHaveAttribute("src", EMBED_RE, { timeout: 20_000 });
  });
});

test.describe("Composer — membro publica só texto", () => {
  test("membro NÃO vê os campos de imagem/vídeo no composer", async ({ page }) => {
    await page.goto(MEMBER_CHANNEL);
    await page.getByRole("button", { name: MEMBER_CHANNEL_CTA }).click();
    await expect(page.getByLabel("Conteúdo da publicação")).toBeVisible();
    // A regra: membro só posta texto.
    await expect(page.getByRole("button", { name: "Adicionar imagem" })).toHaveCount(0);
    await expect(page.getByLabel("URL do vídeo do YouTube")).toHaveCount(0);
  });

  test("criar post a partir do feed geral escolhendo o canal", async ({ page }) => {
    const body = `E2E feed-geral ${Date.now()}`;
    await page.goto("/community");
    await page.getByRole("button", { name: "Criar publicação" }).click();

    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Apresente-se" }).click();
    await page.getByLabel("Conteúdo da publicação").fill(body);

    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/community")),
      page.getByRole("button", { name: "Publicar", exact: true }).click(),
    ]);
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });

    await page.goto(MEMBER_CHANNEL);
    await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 });
  });
});
