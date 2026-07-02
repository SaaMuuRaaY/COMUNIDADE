import { Suspense } from "react";
import { notFound } from "next/navigation";
import { Clock, MessageSquareText, Sparkles } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { FeedFilter } from "@/components/community/feed-filter";
import { ChannelIcon } from "@/components/community/channel-icon";
import { SectionBanner } from "@/components/shared/section-banner";
import { requireProfile } from "@/lib/auth/current-user";
import { canModerate } from "@/lib/permissions/policies";
import { getFeedPosts } from "@/server/queries/posts";
import { getChannel, canPostInChannel, isChannelPending, CHANNEL_GROUPS } from "@/lib/community/structure";

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
      <SectionBanner
        icon={MessageSquareText}
        eyebrow="Portal Nexus"
        title="Comunidade"
        description="Acompanhe as publicações, novidades, projetos e conversas de todos os canais do Portal Nexus."
        variant="featured"
      />

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
  const groupLabel =
    CHANNEL_GROUPS.find((g) => g.slug === channel.groupSlug)?.label ?? "Comunidade";

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner
        iconNode={<ChannelIcon id={channel.icon} className="h-5 w-5" />}
        eyebrow={groupLabel}
        title={channel.label}
        description={channel.description}
        variant="featured"
      />

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
    if (channel) {
      const ch = getChannel(channel);
      return (
        <ChannelPreparingNotice label={ch?.label ?? "Este canal"} description={ch?.description ?? ""} />
      );
    }
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Nada por aqui ainda"
        description="Ainda não há publicações."
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

// Aviso "Em preparação" (estilo /agentes) para canais ainda sem publicação.
function ChannelPreparingNotice({ label, description }: { label: string; description: string }) {
  return (
    <Card>
      <CardContent className="space-y-5 p-6">
        <Badge variant="secondary" className="gap-1.5">
          <Clock className="h-3.5 w-3.5" /> Em preparação
        </Badge>

        <p className="text-sm leading-relaxed text-muted-foreground">
          O canal <span className="font-medium text-foreground">{label}</span> está começando agora.
          {description ? ` ${description}` : ""} Em breve, as primeiras publicações e novidades
          aparecem por aqui.
        </p>

        <div className="space-y-2">
          <p className="flex items-center gap-2 text-sm font-medium">
            <Sparkles className="h-4 w-4 text-[var(--accent)]" /> O que vem por aí
          </p>
          <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
            <li>Publicações e novidades deste canal.</li>
            <li>Um espaço para trocar ideias com a comunidade.</li>
          </ul>
        </div>

        <p className="text-xs text-muted-foreground">
          Fique de olho — este canal será atualizado em breve.
        </p>
      </CardContent>
    </Card>
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
