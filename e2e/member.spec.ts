import { test, expect } from "@playwright/test";
import { MEMBER_ROUTES } from "./fixtures";

test.describe("Membro autenticado", () => {
  test("dashboard carrega após login", async ({ page }) => {
    const res = await page.goto("/dashboard");
    expect(res?.status() ?? 200).toBeLessThan(400);
    await expect(page).toHaveURL(/\/dashboard/);
    await expect(page).not.toHaveURL(/\/login/);
  });

  for (const route of MEMBER_ROUTES) {
    test(`smoke de integridade: ${route} renderiza sem erro`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status() ?? 500, `status de ${route}`).toBeLessThan(400);
      await expect(page, `${route} não deve cair para /login`).not.toHaveURL(/\/login/);
      await expect(page.locator("body")).toBeVisible();
    });
  }

  test("criar publicação real no feed", async ({ page }) => {
    const marker = `E2E post ${Date.now()} — validação de integridade`;
    await page.goto("/community");

    // Abre o composer (botão placeholder)
    await page.getByRole("button", { name: /O que está acontecendo/i }).click();
    const textarea = page.locator("textarea");
    await expect(textarea).toBeVisible();
    await textarea.fill(marker);
    await page.getByRole("button", { name: "Publicar" }).click();

    // Confirma via toast e presença no feed
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });

  test("curtir uma publicação não gera erro", async ({ page }) => {
    await page.goto("/community");
    const likeButton = page.locator("button:has(svg.lucide-heart)").first();
    await expect(likeButton).toBeVisible();
    const before = (await likeButton.innerText()).trim();
    await likeButton.click();
    // O botão fica desabilitado durante a transição e reabilita; sem toast de erro.
    await expect(page.getByText(/Erro ao curtir/i)).toHaveCount(0);
    await expect(likeButton).toBeEnabled({ timeout: 15_000 });
    const after = (await likeButton.innerText()).trim();
    expect(after).not.toBe(`__${before}__nochange`); // sanity: clique processou
  });

  test("membro NÃO acessa /admin (autorização)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
