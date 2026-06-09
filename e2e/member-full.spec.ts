import { test, expect } from "@playwright/test";

test.describe("Membro — fluxos completos", () => {
  test("comentar em uma publicação", async ({ page }) => {
    const postBody = `E2E post p/ comentar ${Date.now()}`;
    const comment = `E2E comentário ${Date.now()}`;

    await page.goto("/community");
    await page.getByRole("button", { name: /O que está acontecendo/i }).click();
    await page.locator("textarea").fill(postBody);
    await page.getByRole("button", { name: "Publicar" }).click();
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(postBody)).toBeVisible({ timeout: 20_000 });

    // Abre o post mais recente (topo do feed) e comenta.
    await page.locator('a[href^="/community/"]').first().click();
    await page.waitForURL(/\/community\/[0-9a-f-]+/);
    await page.getByPlaceholder("Adicione um comentário…").fill(comment);
    await page.getByRole("button", { name: "Comentar" }).click();
    await expect(page.getByText("Comentário enviado.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(comment)).toBeVisible({ timeout: 20_000 });
  });

  test("busca no feed atualiza a URL", async ({ page }) => {
    await page.goto("/community");
    await page.getByPlaceholder("Buscar publicações…").fill("teste");
    await page.getByRole("button", { name: "Buscar" }).click();
    await expect(page).toHaveURL(/[?&]q=teste/);
  });

  test("filtro por categoria atualiza a URL", async ({ page }) => {
    await page.goto("/community");
    await page.getByRole("button", { name: "Dúvidas" }).click();
    await expect(page).toHaveURL(/category=duvidas/);
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
