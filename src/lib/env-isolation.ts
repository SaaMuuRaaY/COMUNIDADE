import productionRef from "./production-supabase-ref.json";

/**
 * Guarda de isolamento de ambientes (incidente P0 de 2026-07-10: a suíte E2E
 * escreveu no Supabase de produção).
 *
 * O ref de produção é uma CONSTANTE RASTREADA, não uma variável de ambiente:
 * uma guarda que se desliga trocando uma env var não é uma guarda. O valor já é
 * público — vai no bundle do browser dentro de NEXT_PUBLIC_SUPABASE_URL.
 *
 * Não existe bypass. Não usar NODE_ENV: builds de Preview também rodam como
 * "production".
 */
export const PRODUCTION_PROJECT_REF = productionRef.ref;

export type AppEnv = "local" | "test" | "preview" | "production";

const APP_ENVS: readonly string[] = ["local", "test", "preview", "production"];

/** Ref do projeto a partir da URL. Supabase local devolve "local". Lança se a URL for inválida. */
export function projectRefOf(url: string): string {
  let host: string;
  try {
    host = new URL(url).hostname;
  } catch {
    throw new Error(`[env-isolation] NEXT_PUBLIC_SUPABASE_URL não é uma URL válida: "${url}"`);
  }
  if (host === "127.0.0.1" || host === "localhost") return "local";
  if (!host.endsWith(".supabase.co")) {
    throw new Error(`[env-isolation] não foi possível derivar o project ref de "${host}"`);
  }
  const ref = host.slice(0, -".supabase.co".length);
  if (!ref) throw new Error(`[env-isolation] project ref vazio em "${host}"`);
  return ref;
}

export function appEnvOf(value: string | undefined): AppEnv {
  if (!value) {
    throw new Error("[env-isolation] APP_ENV não definido. Use: local | test | preview | production.");
  }
  if (!APP_ENVS.includes(value)) {
    throw new Error(`[env-isolation] APP_ENV inválido: "${value}". Use: local | test | preview | production.`);
  }
  return value as AppEnv;
}

/**
 * Falha se o ambiente e o projeto Supabase não combinarem. Deve rodar ANTES da
 * primeira chamada de rede — na criação do client, não no primeiro erro.
 */
export function assertEnvIsolation(opts?: { url?: string; appEnv?: string }): {
  appEnv: AppEnv;
  ref: string;
} {
  const appEnv = appEnvOf(opts?.appEnv ?? process.env.APP_ENV);
  const url = opts?.url ?? process.env.NEXT_PUBLIC_SUPABASE_URL;
  if (!url) throw new Error("[env-isolation] NEXT_PUBLIC_SUPABASE_URL ausente.");

  const ref = projectRefOf(url);

  if (appEnv !== "production" && ref === PRODUCTION_PROJECT_REF) {
    throw new Error(
      `SECURITY: ambiente não produtivo conectado ao Supabase de produção (APP_ENV="${appEnv}", ref="${ref}").`,
    );
  }
  if (appEnv === "production" && ref !== PRODUCTION_PROJECT_REF) {
    throw new Error(`SECURITY: produção conectada ao projeto Supabase incorreto (ref="${ref}").`);
  }

  return { appEnv, ref };
}
