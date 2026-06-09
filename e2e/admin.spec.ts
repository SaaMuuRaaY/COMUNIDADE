import { test, expect } from "@playwright/test";
import { ADMIN_ROUTES } from "./fixtures";

test.describe("Admin autenticado", () => {
  test("painel /admin carrega", async ({ page }) => {
    const res = await page.goto("/admin");
    expect(res?.status() ?? 200).toBeLessThan(400);
    await expect(page).toHaveURL(/\/admin/);
    await expect(page).not.toHaveURL(/\/dashboard$/);
  });

  for (const route of ADMIN_ROUTES) {
    test(`smoke de integridade admin: ${route} renderiza sem erro`, async ({ page }) => {
      const res = await page.goto(route);
      expect(res?.status() ?? 500, `status de ${route}`).toBeLessThan(400);
      await expect(page, `${route} deve permanecer em /admin`).toHaveURL(/\/admin/);
      await expect(page.locator("body")).toBeVisible();
    });
  }
});
