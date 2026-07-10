import * as Sentry from "@sentry/nextjs";
import { assertEnvIsolation } from "@/lib/env-isolation";

export async function register() {
  const isServer = process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge";

  // Sentry PRIMEIRO: se a guarda derrubar o boot (config de env errada em produção),
  // esse é o crash mais crítico do próprio mecanismo anti-incidente — precisa ser
  // observável, não descoberto por reclamação.
  if (isServer && process.env.SENTRY_DSN) {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }

  // Antes de qualquer request: o servidor não sobe apontando para o projeto errado.
  if (process.env.NEXT_RUNTIME === "nodejs") {
    try {
      assertEnvIsolation();
    } catch (e) {
      Sentry.captureException(e);
      throw e; // ainda recusa subir com env errado — só que agora com alerta
    }
  }
}

export const onRequestError = Sentry.captureRequestError;
