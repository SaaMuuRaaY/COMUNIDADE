import * as Sentry from "@sentry/nextjs";
import { assertEnvIsolation } from "@/lib/env-isolation";

export async function register() {
  // Antes de qualquer request: o servidor não sobe apontando para o projeto errado.
  if (process.env.NEXT_RUNTIME === "nodejs") assertEnvIsolation();

  if (!process.env.SENTRY_DSN) return;
  if (process.env.NEXT_RUNTIME === "nodejs" || process.env.NEXT_RUNTIME === "edge") {
    Sentry.init({
      dsn: process.env.SENTRY_DSN,
      environment: process.env.NODE_ENV,
      tracesSampleRate: 0.1,
    });
  }
}

export const onRequestError = Sentry.captureRequestError;
