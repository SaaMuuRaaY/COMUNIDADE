"use server";

import { revalidatePath } from "next/cache";
import { requireActiveProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { onboardingSchema } from "@/lib/validations/schemas";
import { AGREEMENTS_VERSION } from "@/lib/config/agreements";
import { WELCOME_TOUR_VERSION } from "@/lib/onboarding/journey";
import { maybeCompleteJourney } from "@/lib/onboarding/complete";
import { awardPoints } from "@/lib/points/award";
import { POINTS } from "@/lib/constants";
import { reportActionError } from "@/lib/observability";

type Result = { ok: boolean; error?: string };

/**
 * Grava o onboarding (UPSERT). Marca aceite dos acordos + completed_at e concede
 * os 20 pontos de onboarding (idempotente por userId). RLS garante dono-escreve.
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

  // Idempotente: reference_id = userId → premia uma vez só.
  await awardPoints(profile.id, "onboarding_completed", POINTS.ONBOARDING_COMPLETED, "onboarding", profile.id);

  revalidatePath("/onboarding");
  revalidatePath("/comece-por-aqui");
  revalidatePath("/dashboard");
  return { ok: true };
}

/** Fecha o pop-up de boas-vindas (1º acesso). Grava tour + versão. */
export async function markWelcomeTourCompletedAction(): Promise<Result> {
  const profile = await requireActiveProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("member_onboarding")
    .upsert(
      {
        user_id: profile.id,
        welcome_tour_completed_at: new Date().toISOString(),
        tour_version: WELCOME_TOUR_VERSION,
        updated_at: new Date().toISOString(),
      },
      { onConflict: "user_id" },
    );
  if (error) {
    reportActionError("onboarding:welcome-tour", error);
    return { ok: false, error: error.message };
  }
  revalidatePath("/dashboard");
  return { ok: true };
}

/** "Marcar como assistido" do vídeo de boas-vindas. Pode fechar a jornada. */
export async function markWelcomeVideoWatchedAction(): Promise<Result> {
  const profile = await requireActiveProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("member_onboarding")
    .update({ welcome_video_completed_at: new Date().toISOString() })
    .eq("user_id", profile.id);
  if (error) {
    reportActionError("onboarding:welcome-video", error);
    return { ok: false, error: error.message };
  }
  await maybeCompleteJourney(profile.id);
  revalidatePath("/comece-por-aqui");
  return { ok: true };
}
