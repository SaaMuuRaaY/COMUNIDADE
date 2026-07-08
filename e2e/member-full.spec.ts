import { test, expect } from "@playwright/test";
import { MEMBER_CHANNEL, MEMBER_CHANNEL_CTA } from "./fixtures";

test.describe("Membro — fluxos completos", () => {
  test("comentar em uma publicação", async ({ page }) => {
    const postBody = `E2E post p/ comentar ${Date.now()}`;
    const comment = `E2E comentário ${Date.now()}`;

    await page.goto(MEMBER_CHANNEL);
    await page.getByRole("button", { name: MEMBER_CHANNEL_CTA }).click();
    await page.getByLabel("Conteúdo da publicação").fill(postBody);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });

    const card = page.locator("div.bg-card").filter({ hasText: postBody }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });
    await card.locator('a[href^="/post/"]').first().click();
    await page.waitForURL(/\/post\/[0-9a-f-]+/);

    await page.getByLabel("Escrever comentário").fill(comment);
    await page.getByRole("button", { name: "Comentar" }).click();
    await expect(page.getByText("Comentário enviado.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(comment)).toBeVisible({ timeout: 20_000 });
  });

  test("busca no feed atualiza a URL", async ({ page }) => {
    await page.goto("/community");
    await page.getByPlaceholder("Buscar neste canal…").fill("teste");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/[?&]q=teste/);
  });

  test("canal próprio renderiza o feed da unidade", async ({ page }) => {
    await page.goto(MEMBER_CHANNEL);
    await expect(page.getByText("Apresente-se").first()).toBeVisible();
    await expect(page.getByRole("button", { name: MEMBER_CHANNEL_CTA })).toBeVisible();
  });

  test("editar perfil", async ({ page }) => {
    const ts = Date.now();
    await page.goto("/profile");
    await page.locator("#full_name").fill("E2E Membro");
    await page.locator("#username").fill(`e2e_${ts}`);
    await page.locator("#bio").fill("Bio de teste E2E.");
    await page.getByRole("button", { name: "Salvar alterações" }).click();
    await expect(page.getByText("Perfil atualizado.")).toBeVisible({ timeout: 20_000 });
  });
});
