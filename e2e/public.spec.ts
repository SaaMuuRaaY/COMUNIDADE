import { test, expect } from "@playwright/test";

test.describe("Público — render e proteção de rotas", () => {
  test("landing (/) responde", async ({ page }) => {
    const res = await page.goto("/");
    expect(res?.status() ?? 200).toBeLessThan(400);
  });

  test("/login renderiza o formulário", async ({ page }) => {
    await page.goto("/login");
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
    await expect(page.getByRole("button", { name: "Entrar" })).toBeVisible();
  });

  test("/register renderiza o formulário", async ({ page }) => {
    await page.goto("/register");
    await expect(page.locator("#full_name")).toBeVisible();
    await expect(page.locator("#email")).toBeVisible();
    await expect(page.locator("#password")).toBeVisible();
  });

  test("/forgot-password renderiza", async ({ page }) => {
    await page.goto("/forgot-password");
    await expect(page.locator("#email")).toBeVisible();
  });

  test("/api/health responde 200", async ({ request }) => {
    const res = await request.get("/api/health");
    expect(res.status()).toBe(200);
  });

  test("rota privada sem sessão redireciona para /login", async ({ page }) => {
    await page.goto("/dashboard");
    await expect(page).toHaveURL(/\/login/);
  });

  test("/admin sem sessão redireciona para /login", async ({ page }) => {
    await page.goto("/admin");
    await expect(page).toHaveURL(/\/login/);
  });

  test("login com credenciais inválidas mostra erro", async ({ page }) => {
    await page.goto("/login");
    await page.locator("#email").fill("naoexiste@codex.community");
    await page.locator("#password").fill("senhaerrada123");
    await page.getByRole("button", { name: "Entrar" }).click();
    await expect(page.locator("p.text-destructive")).toBeVisible();
    await expect(page).toHaveURL(/\/login/);
  });

  test("forgot-password mostra confirmação de envio", async ({ page }) => {
    await page.goto("/forgot-password");
    await page.locator("#email").fill("alguem@codex.community");
    await page.getByRole("button", { name: "Enviar link de recuperação" }).click();
    await expect(page.getByText(/enviamos um link/i)).toBeVisible({ timeout: 20_000 });
  });
});
