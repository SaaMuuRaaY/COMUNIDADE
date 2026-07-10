import fs from "node:fs";
import { test, expect, type Page } from "@playwright/test";
import { getAdminClient } from "./admin-client";
import { USERS_FILE, type E2EUsers } from "./fixtures";

/**
 * Onboarding Journey ponta-a-ponta com usuário NÃO grandfathered (único que passa
 * pela jornada). `welcome_video.*` é semeado no global-setup e restaurado no teardown.
 *
 * O evento ENDED do YouTube NÃO é exercitado contra o YouTube real: usamos o
 * fallback manual ("Marcar como assistido"), que é justamente o caminho que precisa
 * funcionar quando a API é bloqueada. O stub de `window.YT` cobre o ENDED no final.
 */
test.describe.configure({ mode: "serial" });

function loadUsers(): E2EUsers {
  return JSON.parse(fs.readFileSync(USERS_FILE, "utf8")) as E2EUsers;
}

async function onboardingRow(userId: string) {
  const { data } = await getAdminClient()
    .from("member_onboarding")
    .select("completed_at, introduction_completed_at, welcome_video_completed_at, journey_completed_at")
    .eq("user_id", userId)
    .maybeSingle();
  return data;
}

/** Convite do WhatsApp é NÃO bloqueante: se aparecer, seguimos com "Agora não". */
async function dismissWhatsAppIfPresent(page: Page) {
  const later = page.getByRole("button", { name: "Agora não" });
  if (await later.isVisible().catch(() => false)) await later.click();
}

test.describe("Onboarding Journey (usuário não grandfathered)", () => {
  const users = loadUsers();
  const userId = users.journey.id;

  test("formulário → WhatsApp → apresentação (confetes) → vídeo → tour → /community", async ({ page }) => {
    // 1) Formulário em 3 etapas
    await page.goto("/onboarding");
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    await page.getByRole("checkbox").first().click();
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("combobox").first().click();
    await page.getByRole("option").first().click();
    await page.getByRole("button", { name: "Avançar" }).click();
    await page.getByRole("checkbox").last().click();
    await page.getByRole("button", { name: /^(Concluir|Salvar)$/ }).click();

    await page.waitForURL(/\/comece-por-aqui/, { timeout: 30_000 });
    expect((await onboardingRow(userId))?.completed_at, "formulário concluído").toBeTruthy();

    // 2) WhatsApp não bloqueia
    await dismissWhatsAppIfPresent(page);

    // 3) Apresentação → confetes (mensagem de parabéns) — só na 1ª vez
    await page.goto("/apresente-se");
    await page.getByLabel("Conteúdo da publicação").fill(`E2E jornada ${Date.now()}`);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText("Parabéns, sua apresentação foi publicada!")).toBeVisible({
      timeout: 20_000,
    });
    expect((await onboardingRow(userId))?.introduction_completed_at, "apresentação registrada").toBeTruthy();

    // 4) "Continuar" leva de volta ao Comece por aqui
    await page.getByRole("button", { name: "Continuar" }).click();
    await page.waitForURL(/\/comece-por-aqui/, { timeout: 30_000 });
    await dismissWhatsAppIfPresent(page);

    // 5) Vídeo: CTA primário → modal → fallback manual
    await page.getByRole("button", { name: "Assistir ao vídeo" }).click();
    await page.getByRole("button", { name: "Marcar como assistido" }).click();
    await expect
      .poll(async () => (await onboardingRow(userId))?.welcome_video_completed_at, { timeout: 20_000 })
      .toBeTruthy();

    // A jornada AINDA não concluiu: quem carimba é o fim do tour.
    expect((await onboardingRow(userId))?.journey_completed_at, "tour ainda não concluído").toBeFalsy();

    // 6) Tour inicia sozinho; percorre até o fim
    const tour = page.getByRole("dialog", { name: /Comunidade|Chat Network/ });
    await expect(tour).toBeVisible({ timeout: 20_000 });
    await expect(page.getByText(/Passo 1 de \d+/)).toBeVisible();

    for (let i = 0; i < 20; i++) {
      const next = page.getByRole("button", { name: "Próximo" });
      if (!(await next.isVisible().catch(() => false))) break;
      await next.click();
    }

    // 7) Último passo conclui e redireciona
    await page.getByRole("button", { name: "Ir para a Comunidade" }).click();
    await page.waitForURL(/\/community/, { timeout: 30_000 });

    // 8) journey_completed_at carimbado (única autoridade: completeJourneyAction)
    await expect
      .poll(async () => (await onboardingRow(userId))?.journey_completed_at, { timeout: 20_000 })
      .toBeTruthy();
  });

  test("refresh e reabertura não recelebram; apagar a apresentação não re-bloqueia", async ({ page }) => {
    // Refresh do /apresente-se: sem confetes (a celebração vem da transição server-side).
    await page.goto("/apresente-se");
    await expect(page.getByText("Parabéns, sua apresentação foi publicada!")).toHaveCount(0);

    // Apagar a apresentação: introduction_completed_at PERSISTE → segue desbloqueado.
    const admin = getAdminClient();
    await admin.from("posts").delete().eq("author_id", userId).eq("category", "apresente-se");
    const row = await onboardingRow(userId);
    expect(row?.introduction_completed_at, "prova da apresentação persiste").toBeTruthy();

    // Continua podendo publicar em outro canal permitido ao papel.
    await page.goto("/compartilhe-seu-projeto");
    await page.getByRole("button", { name: "Compartilhar projeto" }).click();
    await page.getByLabel("Conteúdo da publicação").fill(`E2E pós-apresentação ${Date.now()}`);
    await page.getByRole("button", { name: "Publicar", exact: true }).click();
    await expect(page.getByText("Publicação criada.")).toBeVisible({ timeout: 20_000 });
  });

  test("conclusão é idempotente e 'Rever o tour' não altera o timestamp", async ({ page }) => {
    const before = (await onboardingRow(userId))?.journey_completed_at;
    expect(before).toBeTruthy();

    await page.goto("/comece-por-aqui");
    await page.getByRole("button", { name: "Rever o tour" }).click();
    await expect(page.getByText(/Passo 1 de \d+/)).toBeVisible({ timeout: 20_000 });
    // No modo review o último botão é "Fechar" — nunca conclui nada.
    await page.keyboard.press("Escape"); // Escape = continuar depois

    const after = (await onboardingRow(userId))?.journey_completed_at;
    expect(after, "rever o tour não recarimba a jornada").toBe(before);
  });

  test("ENDED do player conclui o vídeo (window.YT mockado, sem YouTube real)", async ({ page, context }) => {
    // Reseta o passo do vídeo para exercitar o ENDED.
    const admin = getAdminClient();
    await admin
      .from("member_onboarding")
      .update({ welcome_video_completed_at: null, journey_completed_at: null })
      .eq("user_id", userId);

    // Stub instalado ANTES de qualquer script da página: o loader resolve de imediato
    // (contrato: "resolve se window.YT?.Player já existe") e nunca busca o YouTube.
    await context.addInitScript(() => {
      const listeners: Array<(e: { data: number }) => void> = [];
      // @ts-expect-error stub de teste
      window.YT = {
        PlayerState: { ENDED: 0, PLAYING: 1, PAUSED: 2 },
        Player: class {
          constructor(_el: unknown, opts: { events?: { onStateChange?: (e: { data: number }) => void } }) {
            if (opts?.events?.onStateChange) listeners.push(opts.events.onStateChange);
            // @ts-expect-error hook de teste
            window.__endVideo = () => listeners.forEach((fn) => fn({ data: 0 }));
          }
          destroy() {}
        },
      };
    });

    await page.goto("/comece-por-aqui");
    await page.getByRole("button", { name: "Assistir ao vídeo" }).click();
    await page.waitForFunction(() => "__endVideo" in window, undefined, { timeout: 20_000 });
    await page.evaluate(() => (window as unknown as { __endVideo: () => void }).__endVideo());

    await expect
      .poll(async () => (await onboardingRow(userId))?.welcome_video_completed_at, { timeout: 20_000 })
      .toBeTruthy();
  });
});
