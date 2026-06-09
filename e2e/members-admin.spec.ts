import { test, expect } from "@playwright/test";

test.describe("Admin — gestão de membros + anti-lockout", () => {
  test("alterar papel e banir/desbanir o membro de teste", async ({ page }) => {
    await page.goto("/admin/members");
    const row = page.locator("li").filter({ hasText: "E2E Membro" }).first();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Banir" }).click();
    await expect(page.getByText("Membro banido.")).toBeVisible({ timeout: 20_000 });

    await row.getByRole("button", { name: "Desbanir" }).click();
    await expect(page.getByText("Banimento removido.")).toBeVisible({ timeout: 20_000 });

    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "Moderador" }).click();
    await expect(page.getByText("Papel atualizado.")).toBeVisible({ timeout: 20_000 });
  });

  test("anti-lockout: admin não rebaixa nem bane a si mesmo", async ({ page }) => {
    await page.goto("/admin/members");
    const myRow = page.locator("li").filter({ hasText: "E2E Admin" }).first();
    await expect(myRow).toBeVisible();

    await myRow.getByRole("combobox").click();
    await page.getByRole("option", { name: "Membro" }).click();
    await expect(page.getByText(/não pode remover seu próprio acesso/i)).toBeVisible({ timeout: 20_000 });

    await myRow.getByRole("button", { name: "Banir" }).click();
    await expect(page.getByText(/não pode banir a si mesmo/i)).toBeVisible({ timeout: 20_000 });
  });
});
