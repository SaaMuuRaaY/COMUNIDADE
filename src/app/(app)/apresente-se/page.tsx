import { CommunityChannelFeed } from "@/components/community/community-feed";
import { getChannel } from "@/lib/community/structure";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { buildIntroductionDraft } from "@/lib/onboarding/introduction";

const SLUG = "apresente-se";
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
    .select("ai_level, goals, interests, current_project, completed_at, introduction_completed_at, grandfathered_at")
    .eq("user_id", profile.id)
    .maybeSingle();

  // Pré-preenche a apresentação SÓ para quem está no passo dela (concluiu o
  // formulário, ainda não se apresentou e não é grandfathered).
  const draft =
    mo && mo.completed_at && !mo.introduction_completed_at && !mo.grandfathered_at
      ? buildIntroductionDraft(profile.full_name ?? "membro", mo)
      : undefined;

  return <CommunityChannelFeed slug={SLUG} search={sp.q?.trim() ?? ""} composerInitialBody={draft} />;
}
