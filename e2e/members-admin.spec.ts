import { test, expect } from "@playwright/test";

test.describe("Admin — gestão de membros + anti-lockout", () => {
  // Banir passa por um ConfirmDialog (ação destrutiva); desbanir é direto.
  async function confirmBan(page: import("@playwright/test").Page) {
    await page.getByRole("dialog").getByRole("button", { name: "Banir", exact: true }).click();
  }

  test("alterar papel e banir/desbanir o membro de teste", async ({ page }) => {
    await page.goto("/admin/members");
    const row = page.locator("li").filter({ hasText: "E2E Membro" }).first();
    await expect(row).toBeVisible();

    await row.getByRole("button", { name: "Banir", exact: true }).click();
    await expect(page.getByRole("dialog")).toContainText("Banir membro?");
    await confirmBan(page);
    await expect(page.getByText("Membro banido.")).toBeVisible({ timeout: 20_000 });

    await row.getByRole("button", { name: "Desbanir" }).click();
    await expect(page.getByText("Banimento removido.")).toBeVisible({ timeout: 20_000 });

    await row.getByRole("combobox").click();
    await page.getByRole("option", { name: "Moderador" }).click();
    await expect(page.getByText("Papel atualizado.")).toBeVisible({ timeout: 20_000 });
  });

  // canManageMember(): um admin não-owner não gerencia outro admin — inclusive a si
  // mesmo. A UI nem expõe os controles; o guard real (RPC) é coberto em rls.spec.ts.
  test("anti-lockout: a UI não expõe gestão do próprio admin", async ({ page }) => {
    await page.goto("/admin/members");
    const myRow = page.locator("li").filter({ hasText: "E2E Admin" }).first();
    await expect(myRow).toBeVisible();

    await expect(myRow.getByText("Sem permissão")).toBeVisible();
    await expect(myRow.getByRole("combobox")).toHaveCount(0);
    await expect(myRow.getByRole("button", { name: "Banir", exact: true })).toHaveCount(0);
  });
});
