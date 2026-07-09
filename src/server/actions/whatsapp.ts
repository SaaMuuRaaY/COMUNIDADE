"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth/current-user";
import { reportActionError } from "@/lib/observability";

type Result = { ok: boolean; error?: string };

/**
 * Registra uma EXIBIÇÃO do convite via RPC ATÔMICA (record_whatsapp_invite_shown,
 * 0037): incrementa o contador + seta 1ª/última data num único UPDATE, com debounce
 * de 1h no WHERE. Atômico → sem race/duplo-incremento em StrictMode ou concorrência.
 */
export async function recordInviteShownAction(): Promise<Result> {
  await requireActiveProfile();
  const supabase = await createClient();
  const { error } = await supabase.rpc("record_whatsapp_invite_shown");
  if (error) {
    reportActionError("whatsapp:shown", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** Registra o CLIQUE em "Entrar no grupo" (analytics). NÃO encerra a campanha. */
export async function recordInviteClickedAction(): Promise<Result> {
  const profile = await requireActiveProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("member_onboarding")
    .update({ whatsapp_invite_clicked_at: new Date().toISOString() })
    .eq("user_id", profile.id);
  if (error) {
    reportActionError("whatsapp:clicked", error);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}

/** "Já entrei" — membro declara que entrou. Encerra a campanha (auto-declarado). */
export async function claimJoinedAction(): Promise<Result> {
  const profile = await requireActiveProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("member_onboarding")
    .update({ whatsapp_joined_claimed_at: new Date().toISOString() })
    .eq("user_id", profile.id);
  if (error) {
    reportActionError("whatsapp:joined", error);
    return { ok: false, error: error.message };
  }
  // Invalida o RSC do dashboard para o popup não reaparecer no back/prefetch.
  revalidatePath("/dashboard");
  return { ok: true };
}

/** "Não mostrar novamente" — encerra a campanha sem entrada declarada. */
export async function dismissInviteAction(): Promise<Result> {
  const profile = await requireActiveProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("member_onboarding")
    .update({ whatsapp_invite_dismissed_at: new Date().toISOString() })
    .eq("user_id", profile.id);
  if (error) {
    reportActionError("whatsapp:dismissed", error);
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}
