import { CommunityChannelFeed } from "@/components/community/community-feed";
import { getChannel } from "@/lib/community/structure";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getSettings } from "@/server/queries/settings";
import { settingString, settingBoolean } from "@/lib/config/settings";
import { deriveJourney } from "@/lib/onboarding/journey";
import { getRecommendations } from "@/lib/onboarding/recommendations";
import { shouldShowInvite } from "@/lib/whatsapp/invite";
import { OnboardingChecklist } from "@/components/onboarding/onboarding-checklist";
import { WelcomeVideoStep } from "@/components/onboarding/welcome-video-step";
import { JourneyComplete } from "@/components/onboarding/journey-complete";
import { WhatsAppInvite } from "@/components/whatsapp/whatsapp-invite";

const SLUG = "comece-por-aqui";
type SearchParams = Promise<{ q?: string }>;

export function generateMetadata() {
  const ch = getChannel(SLUG);
  return { title: ch ? ch.label + " · Comunidade" : "Comunidade" };
}

export default async function ChannelRootPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: mo } = await supabase
    .from("member_onboarding")
    .select(
      "goals, interests, completed_at, grandfathered_at, welcome_video_completed_at, introduction_completed_at, journey_completed_at, whatsapp_invite_first_shown_at, whatsapp_invite_show_count, whatsapp_joined_claimed_at, whatsapp_invite_dismissed_at, whatsapp_invite_clicked_at",
    )
    .eq("user_id", profile.id)
    .maybeSingle();

  // Jornada: em andamento (checklist) vs. concluída (tela de conclusão). Grandfathered não vê nada.
  const inJourney = !!mo && !mo.grandfathered_at && !mo.journey_completed_at;
  const journeyDone = !!mo && !mo.grandfathered_at && !!mo.journey_completed_at;
  let beforeFeed: React.ReactNode = null;

  if (journeyDone && mo) {
    beforeFeed = (
      <JourneyComplete points={profile.points} recommendations={getRecommendations(mo.interests, mo.goals)} />
    );
  } else if (inJourney && mo) {
    const settings = await getSettings();
    const videoUrl = settingString(settings, "welcome_video.url");
    const videoRequired = settingBoolean(settings, "welcome_video.enabled") && !!videoUrl;
    const { steps } = deriveJourney(mo, { videoRequired });
    const waUrl = settingString(settings, "whatsapp_invite.url");
    // eslint-disable-next-line react-hooks/purity
    const nowMs = Date.now();
    const showWa =
      settingBoolean(settings, "whatsapp_invite.enabled") && !!waUrl && shouldShowInvite(mo, nowMs);

    beforeFeed = (
      <div className="space-y-4">
        <OnboardingChecklist steps={steps} />
        {videoRequired ? (
          <WelcomeVideoStep
            url={videoUrl ?? ""}
            title={settingString(settings, "welcome_video.title") ?? "Vídeo de boas-vindas"}
            watched={!!mo.welcome_video_completed_at}
          />
        ) : null}
        {showWa && waUrl ? (
          <WhatsAppInvite
            url={waUrl}
            title={settingString(settings, "whatsapp_invite.title") ?? "Convite exclusivo"}
            description={
              settingString(settings, "whatsapp_invite.description") ??
              "Entre no grupo oficial da comunidade no WhatsApp para receber avisos, novas aulas, recursos, eventos e oportunidades."
            }
          />
        ) : null}
      </div>
    );
  }

  return <CommunityChannelFeed slug={SLUG} search={sp.q?.trim() ?? ""} beforeFeed={beforeFeed} />;
}
