"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validations/schemas";
import { AGREEMENTS_VERSION } from "@/lib/config/agreements";

type Result = { ok: boolean; error?: string };

/**
 * Grava o onboarding do usuario (UPSERT em member_onboarding). Idempotente:
 * pode ser reenviado pra atualizar. Marca aceite dos acordos (versao + timestamp)
 * e completed_at. RLS garante que so o dono escreve a propria linha.
 */
export async function submitOnboardingAction(input: unknown): Promise<Result> {
  const profile = await requireActiveProfile();
  const parsed = onboardingSchema.safeParse(input);
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  }
  const v = parsed.data;

  const supabase = await createClient();
  const now = new Date().toISOString();
  const { error } = await supabase.from("member_onboarding").upsert(
    {
      user_id: profile.id,
      ai_level: v.ai_level,
      goals: v.goals,
      interests: v.interests,
      current_project: v.current_project ?? null,
      participation_goal: v.participation_goal,
      agreements_version: AGREEMENTS_VERSION,
      agreements_accepted_at: now,
      completed_at: now,
      updated_at: now,
    },
    { onConflict: "user_id" },
  );
  if (error) return { ok: false, error: error.message };

  revalidatePath("/onboarding");
  revalidatePath("/dashboard");
  return { ok: true };
}
