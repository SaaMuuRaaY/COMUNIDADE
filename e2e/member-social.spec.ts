import fs from "node:fs";
import { test, expect } from "@playwright/test";
import { getAdminClient } from "./admin-client";
import { USERS_FILE, MEMBER_CHANNEL, MEMBER_CHANNEL_CTA, type E2EUsers } from "./fixtures";

function loadUsers(): E2EUsers {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
}

test.describe("Membro — social", () => {
  // O chat não faz append otimista: a UI é dirigida pela subscription Realtime.
  // Validamos envio + persistência + render (recarregando); a entrega via Realtime
  // na mesma sessão continua sendo verificada manualmente.
  // Esperar a resposta da server action é obrigatório: recarregar antes disso
  // aborta o POST em voo e a mensagem nunca chega ao banco.
  test("enviar mensagem no Chat Network persiste e renderiza", async ({ page }) => {
    const msg = `E2E chat ${Date.now()}`;
    await page.goto("/chat-e-networking");
    await page.getByLabel("Escrever mensagem no chat").fill(msg);

    const [res] = await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes("/chat-e-networking")),
      page.getByRole("button", { name: "Enviar" }).click(),
    ]);
    expect(res.status(), "server action de envio").toBeLessThan(400);

    await page.reload();
    await expect(page.getByText(msg)).toBeVisible({ timeout: 20_000 });
  });

  test("iniciar conversa e enviar DM", async ({ page }) => {
    const users = loadUsers();
    const msg = `E2E dm ${Date.now()}`;
    await page.goto("/mensagens");
    await page.getByRole("button", { name: "Nova conversa" }).click();
    await page.getByPlaceholder("Buscar membro…").fill(users.admin.full_name);
    await page.getByRole("button", { name: new RegExp(users.admin.full_name) }).first().click();
    await page.waitForURL(/\/mensagens\/[0-9a-f-]+/);
    await page.getByLabel("Escrever mensagem direta").fill(msg);
    await page.getByRole("button", { name: "Enviar" }).click();
    await expect(page.getByText(msg)).toBeVisible({ timeout: 20_000 });
  });

  test("salvar publicação e ver em /salvos", async ({ page }) => {
    const body = `E2E salvar ${Date.now()}`;
    await page.goto(MEMBER_CHANNEL);
    await page.getByRole("button", { name: MEMBER_CHANNEL_CTA }).click();
    await page.getByLabel("Conteúdo da publicação").fill(body);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });

    // Escopa ao card do post recém-criado (o topo do feed pode ter posts fixados).
    const card = page.locator("div.bg-card").filter({ hasText: body }).first();
    await expect(card).toBeVisible({ timeout: 20_000 });

    // O botão troca de rótulo otimisticamente; sem esperar a resposta da server
    // action, o goto abaixo abortaria o POST e nada seria salvo.
    await Promise.all([
      page.waitForResponse((r) => r.request().method() === "POST" && r.url().includes(MEMBER_CHANNEL)),
      card.getByRole("button", { name: "Salvar", exact: true }).click(),
    ]);
    await expect(card.getByRole("button", { name: "Remover dos salvos" })).toBeVisible({
      timeout: 20_000,
    });

    await page.goto("/salvos");
    await expect(page.getByText(body)).toBeVisible({ timeout: 20_000 });
  });

  test("completar onboarding em etapas com aceite dos acordos", async ({ page }) => {
    await page.goto("/onboarding");
    // Etapa 1 — Sobre você: nível (combobox) + ao menos 1 objetivo (checkbox).
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    await page.getByRole("checkbox").first().click();
    await page.getByRole("button", { name: "Avançar" }).click();
    // Etapa 2 — Momento atual: como quer participar (único combobox da etapa).
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Avançar" }).click();
    // Etapa 3 — Acordos: aceite (único checkbox da etapa) + Concluir.
    await page.getByRole("checkbox").last().click();
    await page.getByRole("button", { name: /^(Concluir|Salvar)$/ }).click();
    await expect(page.getByText("Tudo pronto! Bem-vindo(a).")).toBeVisible({ timeout: 20_000 });
  });
});

test.describe("Biblioteca — deep-link", () => {
  const stamp = Date.now();
  const slug = `e2e-recurso-${stamp}`;
  const title = `E2E Recurso ${stamp}`;

  test.beforeAll(async () => {
    const users = loadUsers();
    const admin = getAdminClient();
    const { error } = await admin.from("resources").insert({
      title,
      description: "Recurso de teste E2E.",
      category: "templates",
      file_url: "https://example.com/e2e.pdf",
      slug,
      created_by: users.admin.id,
    });
    if (error) throw new Error(`E2E: seed de recurso falhou: ${error.message}`);
  });

  test("abre recurso por URL própria", async ({ page }) => {
    await page.goto(`/resources/${slug}`);
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  });

  test("abre recurso a partir da listagem", async ({ page }) => {
    await page.goto("/resources");
    await page.getByText(title).first().click();
    await page.waitForURL(new RegExp(`/resources/${slug}`));
    await expect(page.getByText(title).first()).toBeVisible({ timeout: 20_000 });
  });
});
