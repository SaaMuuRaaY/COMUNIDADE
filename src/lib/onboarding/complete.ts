import "server-only";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/queries/settings";
import { settingBoolean, settingString } from "@/lib/config/settings";

/**
 * Carimba `journey_completed_at` quando os essenciais estão prontos (formulário +
 * apresentação + vídeo SE houver um configurado). Idempotente: o `.is(null)` no
 * update garante uma única escrita mesmo sob concorrência. Helper server-only.
 */
export async function maybeCompleteJourney(userId: string): Promise<void> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_onboarding")
    .select("completed_at, welcome_video_completed_at, introduction_completed_at, journey_completed_at")
    .eq("user_id", userId)
    .maybeSingle();
  if (!data || data.journey_completed_at) return;

  const settings = await getSettings();
  const videoRequired =
    settingBoolean(settings, "welcome_video.enabled") && !!settingString(settings, "welcome_video.url");

  const videoOk = videoRequired ? !!data.welcome_video_completed_at : true;
  if (data.completed_at && videoOk && data.introduction_completed_at) {
    await supabase
      .from("member_onboarding")
      .update({ journey_completed_at: new Date().toISOString() })
      .eq("user_id", userId)
      .is("journey_completed_at", null);
  }
}
