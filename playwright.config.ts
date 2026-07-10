import { defineConfig, devices } from "@playwright/test";
import { assertEnvIsolation } from "./src/lib/env-isolation";
import { loadTestEnv } from "./e2e/load-test-env";

// Roda no CARREGAMENTO da config — antes do webServer e do globalSetup. Se o
// ambiente estiver errado, nada sobe e nenhum usuário é criado.
loadTestEnv(__dirname);
const { appEnv, ref } = assertEnvIsolation();
console.log(`[e2e] APP_ENV=${appEnv} projeto=${ref}`);

// Porta dedicada ao E2E: não colide com o `pnpm dev`/HUB do desenvolvedor (3004).
const PORT = Number(process.env.E2E_PORT ?? 3099);
const baseURL = `http://localhost:${PORT}`;

// As NEXT_PUBLIC_* são inlinadas no bundle do browser DURANTE O BUILD. Servir um
// build antigo faria o navegador falar com outro projeto que não o do setup —
// exatamente o cenário do incidente. Por isso o webServer builda com este env.
const testEnv = {
  APP_ENV: appEnv,
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL!,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
  NEXT_PUBLIC_APP_URL: baseURL,
  SUPABASE_SERVICE_ROLE_KEY: process.env.SUPABASE_SERVICE_ROLE_KEY!,
};

export default defineConfig({
  testDir: "./e2e",
  outputDir: "./e2e/.runtime/test-results",
  fullyParallel: false,
  forbidOnly: !!process.env.CI,
  retries: process.env.CI ? 1 : 0,
  workers: 1,
  reporter: [["list"], ["html", { outputFolder: "e2e/.runtime/report", open: "never" }]],
  globalSetup: "./e2e/global-setup.ts",
  globalTeardown: "./e2e/global-teardown.ts",
  timeout: 60_000,
  expect: { timeout: 15_000 },
  use: {
    baseURL,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
    actionTimeout: 15_000,
    navigationTimeout: 30_000,
  },
  projects: [
    { name: "setup", testMatch: /auth\.setup\.ts/ },
    {
      // Roda sem depender do setup: prova o isolamento ANTES de criar usuário.
      name: "isolation",
      testMatch: /env-isolation\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "public",
      testMatch: /public\.spec\.ts/,
      use: { ...devices["Desktop Chrome"] },
    },
    {
      name: "member",
      testMatch: [
        "member.spec.ts",
        "member-full.spec.ts",
        "member-social.spec.ts",
        "rls.spec.ts",
        "video.spec.ts",
        "post-media.spec.ts",
      ],
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.runtime/member.json" },
    },
    {
      // Usuário NÃO grandfathered: único que exercita a Onboarding Journey.
      name: "journey",
      testMatch: ["journey.spec.ts"],
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.runtime/journey.json" },
    },
    {
      name: "admin",
      testMatch: [
        "admin.spec.ts",
        "admin-content.spec.ts",
        "members-admin.spec.ts",
        "contextual-admin.spec.ts",
      ],
      dependencies: ["setup"],
      use: { ...devices["Desktop Chrome"], storageState: "e2e/.runtime/admin.json" },
    },
  ],
  webServer: {
    command: `pnpm build && pnpm exec next start -p ${PORT}`,
    url: baseURL,
    timeout: 300_000,
    // Nunca reusar um servidor de pé: ele pode ter sido buildado com outro env.
    reuseExistingServer: false,
    cwd: __dirname,
    env: testEnv,
  },
});
