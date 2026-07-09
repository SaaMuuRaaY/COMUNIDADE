import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { getAdminClient } from "./admin-client";
import { USERS_FILE, type E2EUsers } from "./fixtures";

function loadUsers(): E2EUsers {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
}

const card = (page: Page, text: string) =>
  page.locator("div.bg-card").filter({ hasText: text }).first();

const confirmDelete = (page: Page) =>
  page.getByRole("dialog").getByRole("button", { name: "Excluir", exact: true }).click();

test.describe("Gestão contextual — admin edita/exclui inline", () => {
  test("recurso: editar e excluir em /resources", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E ctx recurso ${stamp}`;
    const edited = `${title} EDITADO`;
    const users = loadUsers();
    const { error } = await getAdminClient()
      .from("resources")
      .insert({
        title,
        description: "ctx",
        category: "templates",
        file_url: "https://example.com/x.pdf",
        slug: `e2e-ctx-res-${stamp}`,
        created_by: users.admin.id,
      });
    if (error) throw new Error(`seed recurso: ${error.message}`);

    await page.goto("/resources");
    await expect(card(page, title)).toBeVisible({ timeout: 20_000 });

    await card(page, title).getByRole("button", { name: "Editar recurso" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").first().fill(edited);
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Recurso atualizado.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(edited)).toBeVisible({ timeout: 20_000 });

    await card(page, edited).getByRole("button", { name: "Excluir recurso" }).click();
    await confirmDelete(page);
    await expect(page.getByText("Recurso excluído.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(edited)).toHaveCount(0);
  });

  test("app: editar e excluir em /apps", async ({ page }) => {
    const stamp = Date.now();
    const name = `E2E ctx app ${stamp}`;
    const edited = `${name} EDITADO`;
    const users = loadUsers();
    const { error } = await getAdminClient()
      .from("apps")
      .insert({
        name,
        description: "ctx",
        category: "ia",
        type: "link",
        status: "active",
        url: "https://example.com",
        slug: `e2e-ctx-app-${stamp}`,
        created_by: users.admin.id,
      });
    if (error) throw new Error(`seed app: ${error.message}`);

    await page.goto("/apps");
    await expect(card(page, name)).toBeVisible({ timeout: 20_000 });

    await card(page, name).getByRole("button", { name: "Editar aplicativo" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").first().fill(edited);
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("App atualizado.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(edited)).toBeVisible({ timeout: 20_000 });

    await card(page, edited).getByRole("button", { name: "Excluir app" }).click();
    await confirmDelete(page);
    await expect(page.getByText("App excluído.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(edited)).toHaveCount(0);
  });

  test("evento: editar e excluir em /calendar", async ({ page }) => {
    const stamp = Date.now();
    const title = `E2E ctx evento ${stamp}`;
    const edited = `${title} EDITADO`;
    const users = loadUsers();
    // Evento no futuro para não ser filtrado como encerrado pelo calendário.
    const startsAt = new Date(Date.now() + 7 * 24 * 3600 * 1000).toISOString();
    const { error } = await getAdminClient()
      .from("events")
      .insert({ title, event_type: "live", starts_at: startsAt, created_by: users.admin.id });
    if (error) throw new Error(`seed evento: ${error.message}`);

    await page.goto("/calendar");
    await expect(card(page, title)).toBeVisible({ timeout: 20_000 });

    await card(page, title).getByRole("button", { name: "Editar evento" }).click();
    const dialog = page.getByRole("dialog");
    await dialog.getByRole("textbox").first().fill(edited);
    await dialog.getByRole("button", { name: "Salvar" }).click();
    await expect(page.getByText("Evento atualizado.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(edited)).toBeVisible({ timeout: 20_000 });

    await card(page, edited).getByRole("button", { name: "Excluir evento" }).click();
    await confirmDelete(page);
    await expect(page.getByText("Evento excluído.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(edited)).toHaveCount(0);
  });
});
