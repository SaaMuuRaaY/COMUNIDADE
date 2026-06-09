import { test, expect } from "@playwright/test";

// Fluxos de ESCRITA reais como admin: criar curso (publicado) + módulo + aula,
// e cadastrar um app. Tudo via UABI real (clicando), validado por toast + persistência.
test.describe("Admin — criação de conteúdo (fluxo completo)", () => {
  test("criar curso publicado com módulo e aula, e ver na vitrine", async ({ page }) => {
    const ts = Date.now();
    const courseTitle = `Curso E2E ${ts}`;
    const moduleTitle = `Modulo E2E ${ts}`;
    const lessonTitle = `Aula E2E ${ts}`;

    // 1) Criar o curso (status = Publicado)
    await page.goto("/admin/courses/new");
    await page.locator("#title").fill(courseTitle);
    await page.locator("#slug").fill(`curso-e2e-${ts}`);
    await page.locator("#description").fill("Curso criado pelo teste E2E de integridade.");
    await page.getByRole("combobox").click();
    await page.getByRole("option", { name: "Publicado" }).click();
    await page.getByRole("button", { name: "Criar curso" }).click();

    // Redireciona para o editor
    await page.waitForURL(/\/admin\/courses\/[^/]+\/edit/, { timeout: 30_000 });
    await expect(page.getByText("Curso criado.")).toBeVisible({ timeout: 20_000 });

    // 2) Adicionar módulo
    await page.getByPlaceholder("Título do módulo").fill(moduleTitle);
    await page.getByRole("button", { name: "Adicionar", exact: true }).click();
    await expect(page.getByText("Módulo criado.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(moduleTitle)).toBeVisible();

    // 3) Adicionar aula dentro do módulo
    const lessonGrid = page.locator("div.grid").filter({
      has: page.getByPlaceholder(/Supabase Storage/),
    });
    await lessonGrid.locator("input").first().fill(lessonTitle);
    await page.getByRole("button", { name: "Adicionar aula" }).click();
    await expect(page.getByText("Aula criada.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(lessonTitle)).toBeVisible();

    // 4) Curso publicado aparece na vitrine /courses
    await page.goto("/courses");
    await expect(page.getByText(courseTitle)).toBeVisible({ timeout: 20_000 });
  });

  test("cadastrar um app na biblioteca", async ({ page }) => {
    const ts = Date.now();
    const appName = `App E2E ${ts}`;

    await page.goto("/admin/apps");
    await page.locator("div.space-y-1").filter({ hasText: "Nome" }).getByRole("textbox").fill(appName);
    await page.getByPlaceholder("https://…", { exact: true }).fill("https://exemplo-e2e.com");
    await page.getByRole("button", { name: "Cadastrar app" }).click();

    await expect(page.getByText("App cadastrado.")).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(appName)).toBeVisible({ timeout: 20_000 });
  });
});
