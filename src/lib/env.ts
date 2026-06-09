import { z } from "zod";

/**
 * Valida as variáveis públicas no boot. Falha cedo e com mensagem clara
 * em vez de comportamento silencioso (ex.: redirects de auth para localhost).
 */
const schema = z.object({
  NEXT_PUBLIC_SUPABASE_URL: z.string().url(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().min(1),
  NEXT_PUBLIC_APP_URL: z.string().url().default("http://localhost:3004"),
});

const parsed = schema.safeParse({
  NEXT_PUBLIC_SUPABASE_URL: process.env.NEXT_PUBLIC_SUPABASE_URL,
  NEXT_PUBLIC_SUPABASE_ANON_KEY: process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  NEXT_PUBLIC_APP_URL: process.env.NEXT_PUBLIC_APP_URL,
});

if (!parsed.success) {
  throw new Error(
    "[env] Variáveis públicas ausentes/inválidas: " +
      parsed.error.issues.map((i) => `${i.path.join(".")} (${i.message})`).join("; "),
  );
}

export const env = parsed.data;

if (process.env.NODE_ENV === "production" && env.NEXT_PUBLIC_APP_URL.includes("localhost")) {
  console.warn(
    "[env] NEXT_PUBLIC_APP_URL aponta para localhost em produção — e-mails de confirmação/reset ficarão quebrados.",
  );
}
