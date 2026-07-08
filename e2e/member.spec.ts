import { test, expect } from "@playwright/test";
import { MEMBER_ROUTES, MEMBER_CHANNEL, MEMBER_CHANNEL_CTA } from "./fixtures";

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

  test("criar publicação real em um canal", async ({ page }) => {
    const marker = `E2E post ${Date.now()} — validação de integridade`;
    await page.goto(MEMBER_CHANNEL);

    await page.getByRole("button", { name: MEMBER_CHANNEL_CTA }).click();
    const body = page.getByLabel("Conteúdo da publicação");
    await expect(body).toBeVisible();
    await body.fill(marker);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();

    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(marker)).toBeVisible({ timeout: 20_000 });
  });

  test("curtir uma publicação alterna o estado sem erro", async ({ page }) => {
    await page.goto("/community");
    // aria-label/aria-pressed do botão de curtir tornam o estado observável.
    const likeButton = page
      .locator('button[aria-label^="Curtir"], button[aria-label^="Descurtir"]')
      .first();
    await expect(likeButton).toBeVisible();

    const wasLiked = (await likeButton.getAttribute("aria-pressed")) === "true";
    await likeButton.click();

    await expect(page.getByText(/Não foi possível atualizar a curtida/i)).toHaveCount(0);
    await expect(likeButton).toHaveAttribute("aria-pressed", String(!wasLiked), {
      timeout: 20_000,
    });
  });

  test("membro NÃO acessa /admin (autorização)", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/dashboard/);
  });
});
