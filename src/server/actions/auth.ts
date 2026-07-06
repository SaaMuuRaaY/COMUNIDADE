"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { loginSchema, registerSchema, forgotPasswordSchema } from "@/lib/validations/schemas";
import { safeNextPath } from "@/lib/auth/safe-next-path";
import { env } from "@/lib/env";
import { rateLimit, clientIp } from "@/lib/security/rate-limit";

/** Le e valida o destino de retorno (deep-link) do FormData. */
function readNext(formData: FormData): string {
  const raw = formData.get("next");
  return safeNextPath(typeof raw === "string" ? raw : null);
}

export type ActionState = { ok: boolean; error?: string; pending?: boolean };

const TOO_MANY = "Muitas tentativas. Aguarde um minuto e tente novamente.";
const callbackUrl = `${env.NEXT_PUBLIC_APP_URL}/auth/callback`;

export async function loginAction(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`login:${ip}`, { limit: 10, windowMs: 60_000 })).ok) return { ok: false, error: TOO_MANY };

  const parsed = loginSchema.safeParse({
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword(parsed.data);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/", "layout");
  redirect(readNext(formData));
}

export async function registerAction(_prev: ActionState | null, formData: FormData): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`register:${ip}`, { limit: 5, windowMs: 60_000 })).ok) return { ok: false, error: TOO_MANY };

  const parsed = registerSchema.safeParse({
    full_name: formData.get("full_name"),
    email: formData.get("email"),
    password: formData.get("password"),
  });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }

  const next = readNext(formData);
  // Sessao IMEDIATA (confirmacao desligada) -> vai pro onboarding e depois ao next.
  // Confirmacao por E-MAIL -> o callback decide o onboarding (checa completed_at),
  // entao aqui o emailRedirectTo carrega o next CRU (destino final).
  const afterAuth = `/onboarding?next=${encodeURIComponent(next)}`;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.signUp({
    email: parsed.data.email,
    password: parsed.data.password,
    options: {
      data: { full_name: parsed.data.full_name },
      emailRedirectTo: `${callbackUrl}?next=${encodeURIComponent(next)}`,
    },
  });
  if (error) return { ok: false, error: error.message };

  // Confirmação de e-mail ligada: signUp não cria sessão até confirmar.
  if (!data.session) {
    return { ok: true, pending: true };
  }

  revalidatePath("/", "layout");
  redirect(afterAuth);
}

export async function resendConfirmationAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const parsed = z.string().email().safeParse(formData.get("email"));
  if (!parsed.success) return { ok: false, error: "E-mail inválido" };

  const ip = await clientIp();
  if (!(await rateLimit(`resend:${ip}`, { limit: 3, windowMs: 60_000 })).ok) return { ok: false, error: TOO_MANY };

  const supabase = await createClient();
  const { error } = await supabase.auth.resend({
    type: "signup",
    email: parsed.data,
    options: { emailRedirectTo: callbackUrl },
  });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function forgotPasswordAction(
  _prev: ActionState | null,
  formData: FormData,
): Promise<ActionState> {
  const ip = await clientIp();
  if (!(await rateLimit(`forgot:${ip}`, { limit: 4, windowMs: 60_000 })).ok) return { ok: false, error: TOO_MANY };

  const parsed = forgotPasswordSchema.safeParse({ email: formData.get("email") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "E-mail inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.resetPasswordForEmail(parsed.data.email, {
    redirectTo: callbackUrl,
  });
  if (error) return { ok: false, error: error.message };

  return { ok: true };
}

export async function logoutAction(): Promise<void> {
  const supabase = await createClient();
  await supabase.auth.signOut();
  revalidatePath("/", "layout");
  redirect("/login");
}
