import fs from "node:fs";
import { test as setup, expect, type Page } from "@playwright/test";
import {
  USERS_FILE,
  MEMBER_STATE,
  ADMIN_STATE,
  JOURNEY_STATE,
  type E2EUsers,
  type E2EUser,
} from "./fixtures";

const users = JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;

async function login(page: Page, user: E2EUser) {
  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL("**/dashboard", { timeout: 30_000 });
  await expect(page).toHaveURL(/\/dashboard/);
}

setup("autenticar membro", async ({ page }) => {
  await login(page, users.member);
  await page.context().storageState({ path: MEMBER_STATE });
});

setup("autenticar admin", async ({ page }) => {
  await login(page, users.admin);
  await page.context().storageState({ path: ADMIN_STATE });
});

/**
 * O usuário da jornada NÃO é grandfathered: o callback o manda para /onboarding
 * (não /dashboard). Por isso este login espera a rota do onboarding.
 */
setup("autenticar jornada", async ({ page }) => {
  const user = users.journey;
  await page.goto("/login");
  await page.locator("#email").fill(user.email);
  await page.locator("#password").fill(user.password);
  await page.getByRole("button", { name: "Entrar" }).click();
  await page.waitForURL(/\/(onboarding|dashboard)/, { timeout: 30_000 });
  await page.context().storageState({ path: JOURNEY_STATE });
});
