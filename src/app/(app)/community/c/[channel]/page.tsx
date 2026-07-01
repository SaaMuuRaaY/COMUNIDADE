import { Suspense } from "react";
import { notFound } from "next/navigation";
import { MessageSquareText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { FeedFilter } from "@/components/community/feed-filter";
import { ChannelIcon } from "@/components/community/channel-icon";
import { requireProfile } from "@/lib/auth/current-user";
import { canModerate } from "@/lib/permissions/policies";
import { getFeedPosts } from "@/server/queries/posts";
import { getChannel, canPostInChannel } from "@/lib/community/structure";

type Params = Promise<{ channel: string }>;
type SearchParams = Promise<{ q?: string }>;

export async function generateMetadata({ params }: { params: Params }) {
  const { channel } = await params;
  const ch = getChannel(channel);
  return { title: ch ? `${ch.label} · Comunidade` : "Comunidade" };
}

export default async function ChannelPage({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { channel: slug } = await params;
  const channel = getChannel(slug);
  if (!channel) notFound();

  const profile = await requireProfile();
  const sp = await searchParams;
  const search = sp.q ?? "";
  const showComposer = canPostInChannel(profile, slug);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="flex items-start gap-3">
        <ChannelIcon id={channel.icon} className="mt-0.5 h-6 w-6 text-[var(--accent)]" />
        <div className="min-w-0">
          <h1 className="text-xl font-semibold tracking-tight">{channel.label}</h1>
          <p className="text-sm text-muted-foreground">{channel.description}</p>
        </div>
      </div>

      <FeedFilter />

      {showComposer ? (
        <PostComposer channelSlug={slug} currentUserId={profile.id} />
      ) : channel.type === "announcement" ? (
        <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Canal oficial — apenas a equipe publica aqui.
        </p>
      ) : null}

      <Suspense fallback={<FeedSkeleton />}>
        <Feed userId={profile.id} channel={slug} search={search} canMod={canModerate(profile)} />
      </Suspense>
    </div>
  );
}

async function Feed({
  userId,
  channel,
  search,
  canMod,
}: {
  userId: string;
  channel: string;
  search: string;
  canMod: boolean;
}) {
  const posts = await getFeedPosts({ userId, channel, search });
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Nada por aqui ainda"
        description="Seja o primeiro a publicar neste canal."
      />
    );
  }
  return (
    <div className="space-y-4">
      {posts.map((p) => (
        <PostCard key={p.id} post={p} currentUserId={userId} canModerate={canMod} />
      ))}
    </div>
  );
}

function FeedSkeleton() {
  return (
    <div className="space-y-4">
      {[1, 2, 3].map((i) => (
        <div key={i} className="rounded-xl border p-5">
          <div className="flex items-center gap-3">
            <Skeleton className="h-10 w-10 rounded-full" />
            <div className="flex-1 space-y-2">
              <Skeleton className="h-3 w-32" />
              <Skeleton className="h-3 w-24" />
            </div>
          </div>
          <Skeleton className="mt-3 h-4 w-3/4" />
          <Skeleton className="mt-2 h-4 w-1/2" />
        </div>
      ))}
    </div>
  );
}
