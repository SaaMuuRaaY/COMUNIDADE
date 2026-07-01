import "server-only";
import { headers } from "next/headers";

type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

/**
 * Rate-limit in-process (janela fixa). BEST-EFFORT / defesa-em-profundidade.
 *
 * Produção é Vercel (serverless): este `Map` vive POR INSTÂNCIA e some em cold
 * start, então NÃO é um limite global confiável. A proteção primária de auth é
 * o rate-limit nativo do Supabase Auth (GoTrue). Este limiter agrega uma camada
 * leve anti-flood por usuário/IP. Só migrar para store compartilhado (ex.:
 * Upstash/Redis) ou WAF de borda SE houver evidência de abuso. Ver
 * docs/HARDENING_PRE_FEATURES.md (seção Rate limit).
 */
export function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): { ok: boolean; retryAfterMs?: number } {
  const now = Date.now();
  const b = store.get(key);
  if (!b || now >= b.resetAt) {
    store.set(key, { count: 1, resetAt: now + opts.windowMs });
    if (store.size > 5000) prune(now);
    return { ok: true };
  }
  if (b.count >= opts.limit) {
    return { ok: false, retryAfterMs: b.resetAt - now };
  }
  b.count++;
  return { ok: true };
}

function prune(now: number) {
  for (const [k, b] of store) if (now >= b.resetAt) store.delete(k);
}

/** IP do cliente a partir dos headers repassados pelo reverse proxy (Caddy/Nginx). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim() || "unknown";
}
