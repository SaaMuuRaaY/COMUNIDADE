import { CommunityChannelFeed } from "@/components/community/community-feed";
import { getChannel } from "@/lib/community/structure";

const SLUG = "chat-networking";
type SearchParams = Promise<{ q?: string }>;

export function generateMetadata() {
  const ch = getChannel(SLUG);
  return { title: ch ? ch.label + " · Comunidade" : "Comunidade" };
}

export default async function ChannelRootPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  return <CommunityChannelFeed slug={SLUG} search={sp.q?.trim() ?? ""} />;
}
