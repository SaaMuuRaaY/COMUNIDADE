import "server-only";
import { headers } from "next/headers";

type Result = { ok: boolean; retryAfterMs?: number };

// -------------------------------------------------------------------------
// Fallback in-process (janela fixa) — usado quando o Upstash não está
// configurado OU falha (fail-open). BEST-EFFORT: no serverless da Vercel este
// Map vive POR INSTÂNCIA, então sozinho não é um limite global confiável.
// -------------------------------------------------------------------------
type Bucket = { count: number; resetAt: number };
const store = new Map<string, Bucket>();

function memoryLimit(key: string, opts: { limit: number; windowMs: number }): Result {
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

// -------------------------------------------------------------------------
// Upstash Redis (REST) — janela fixa ATÔMICA via EVAL (sem SDK/dependência).
// Ativa só se as duas envs existirem. Config: crie um Redis no Upstash e
// exponha UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN (server-only).
// -------------------------------------------------------------------------
const UPSTASH_URL = process.env.UPSTASH_REDIS_REST_URL;
const UPSTASH_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;
const useRedis = !!(UPSTASH_URL && UPSTASH_TOKEN);

// INCR + PEXPIRE só na 1a batida (fixed-window) + PTTL, tudo atômico no Redis.
const LUA =
  "local c=redis.call('INCR',KEYS[1]); if c==1 then redis.call('PEXPIRE',KEYS[1],ARGV[1]) end; return {c, redis.call('PTTL',KEYS[1])}";

async function redisLimit(key: string, opts: { limit: number; windowMs: number }): Promise<Result | null> {
  try {
    const res = await fetch(UPSTASH_URL as string, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${UPSTASH_TOKEN}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify(["EVAL", LUA, "1", `rl:${key}`, String(opts.windowMs)]),
      cache: "no-store",
    });
    if (!res.ok) {
      console.error("[rate-limit] Upstash HTTP", res.status); // pega 401/403 de misconfig (sem token)
      return null; // fail-open -> fallback local
    }
    const data = (await res.json()) as { result?: [number, number]; error?: string };
    const count = Array.isArray(data.result) ? Number(data.result[0]) : NaN;
    const ttl = Array.isArray(data.result) ? Number(data.result[1]) : NaN;
    // Resposta malformada -> cai no fallback local (NAO libera silenciosamente).
    if (!Number.isFinite(count)) return null;
    if (count > opts.limit) {
      // PTTL pode ser -1 (sem TTL) / -2 (sem chave); nesses casos usa a janela cheia.
      return { ok: false, retryAfterMs: ttl > 0 ? ttl : opts.windowMs };
    }
    return { ok: true };
  } catch {
    return null; // erro de rede -> fail-open pro limiter local
  }
}

/**
 * Rate-limit por chave (janela fixa). Usa Upstash Redis (REST) se configurado —
 * limite GLOBAL confiável no serverless — senão cai no Map in-process.
 * Fail-open: se o Redis estiver fora, o fallback local ainda protege.
 */
export async function rateLimit(
  key: string,
  opts: { limit: number; windowMs: number },
): Promise<Result> {
  if (useRedis) {
    const r = await redisLimit(key, opts);
    if (r) return r;
  }
  return memoryLimit(key, opts);
}

/** IP do cliente a partir dos headers repassados pelo reverse proxy (Caddy/Nginx). */
export async function clientIp(): Promise<string> {
  const h = await headers();
  const xff = h.get("x-forwarded-for");
  return (xff?.split(",")[0] ?? h.get("x-real-ip") ?? "unknown").trim() || "unknown";
}
