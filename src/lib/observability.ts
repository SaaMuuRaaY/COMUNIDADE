import * as Sentry from "@sentry/nextjs";

export function reportActionError(scope: string, error: unknown) {
  const message =
    error instanceof Error
      ? error.message
      : ((error as { message?: string })?.message ?? String(error));
  console.error(`${scope}:`, message);
  Sentry.captureException(error instanceof Error ? error : new Error(`${scope}: ${message}`), {
    tags: { scope },
    extra: { detail: error },
  });
}
