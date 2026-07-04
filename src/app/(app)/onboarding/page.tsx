import { requireActiveProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { OnboardingForm } from "./onboarding-form";

export const metadata = { title: "Comece por aqui" };

export default async function OnboardingPage() {
  const profile = await requireActiveProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("member_onboarding")
    .select(
      "ai_level, goals, interests, current_project, participation_goal, completed_at, agreements_version",
    )
    .eq("user_id", profile.id)
    .maybeSingle();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Comece por aqui</h1>
        <p className="text-sm text-muted-foreground">
          Conte um pouco sobre você pra personalizarmos sua experiência. Leva menos de 1 minuto.
        </p>
      </div>
      <OnboardingForm
        initial={{
          ai_level: data?.ai_level ?? "",
          goals: data?.goals ?? [],
          interests: data?.interests ?? [],
          current_project: data?.current_project ?? "",
          participation_goal: data?.participation_goal ?? "",
        }}
        alreadyCompleted={!!data?.completed_at}
        acceptedVersion={data?.agreements_version ?? null}
      />
    </div>
  );
}
