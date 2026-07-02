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
import { getChannel, canPostInChannel, isChannelPending } from "@/lib/community/structure";

/**
 * Componente COMPARTILHADO de feed da Comunidade (Fase 6.6).
 *
 * - `CommunityGeneralFeed`  → /community (Feed Geral AGREGADO — sem filtro de canal).
 * - `CommunityChannelFeed`  → /[slug] (feed de UMA unidade — filtra por categoria).
 *
 * Ambos preservam: fixados primeiro, busca, composer, permissões, likes, reações
 * e comentários (via getFeedPosts + PostCard, inalterados).
 */

// Canal-alvo do composer no Feed Geral (postável por membro; não é oficial/pendente).
const GENERAL_COMPOSER_CHANNEL = "chat-networking";

export async function CommunityGeneralFeed({ search }: { search: string }) {
  const profile = await requireProfile();
  const canPostGeneral = canPostInChannel(profile, GENERAL_COMPOSER_CHANNEL);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-xl font-semibold tracking-tight">Comunidade</h1>
        <p className="text-sm text-muted-foreground">
          Acompanhe as publicações, novidades, projetos e conversas de todos os canais do
          Portal Nexus.
        </p>
      </div>

      <FeedFilter />

      {canPostGeneral ? (
        <PostComposer channelSlug={GENERAL_COMPOSER_CHANNEL} currentUserId={profile.id} />
      ) : null}

      <Suspense fallback={<FeedSkeleton />}>
        <FeedList userId={profile.id} search={search} canMod={canModerate(profile)} />
      </Suspense>
    </div>
  );
}

export async function CommunityChannelFeed({ slug, search }: { slug: string; search: string }) {
  const channel = getChannel(slug);
  if (!channel) notFound();

  const profile = await requireProfile();
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

      {isChannelPending(slug) ? (
        <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Canal em ativação — disponível em breve.
        </p>
      ) : showComposer ? (
        <PostComposer channelSlug={slug} currentUserId={profile.id} />
      ) : channel.type === "announcement" ? (
        <p className="rounded-md border bg-muted/40 px-4 py-3 text-sm text-muted-foreground">
          Canal oficial — apenas a equipe publica aqui.
        </p>
      ) : null}

      <Suspense fallback={<FeedSkeleton />}>
        <FeedList userId={profile.id} channel={slug} search={search} canMod={canModerate(profile)} />
      </Suspense>
    </div>
  );
}

async function FeedList({
  userId,
  channel,
  search,
  canMod,
}: {
  userId: string;
  channel?: string;
  search: string;
  canMod: boolean;
}) {
  const posts = await getFeedPosts({ userId, channel, search });
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Nada por aqui ainda"
        description={channel ? "Seja o primeiro a publicar neste canal." : "Ainda não há publicações."}
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
