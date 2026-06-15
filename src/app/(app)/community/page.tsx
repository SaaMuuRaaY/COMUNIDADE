import { Suspense } from "react";
import { MessageSquareText } from "lucide-react";
import { Skeleton } from "@/components/ui/skeleton";
import { EmptyState } from "@/components/shared/empty-state";
import { PostComposer } from "@/components/community/post-composer";
import { PostCard } from "@/components/community/post-card";
import { FeedFilter } from "@/components/community/feed-filter";
import { requireProfile } from "@/lib/auth/current-user";
import { canModerate, canPost } from "@/lib/permissions/policies";
import { getFeedPosts } from "@/server/queries/posts";
import type { PostCategory } from "@/types/db";

import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";

export const metadata = { title: "Comunidade" };

type SearchParams = Promise<{ category?: string; q?: string }>;

export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const profile = await requireProfile();
  const sp = await searchParams;
  const category = (sp.category ?? "all") as PostCategory | "all";
  const search = sp.q ?? "";

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.community} />

      <FeedFilter />

      {canPost(profile) ? <PostComposer currentUserId={profile.id} /> : null}

      <Suspense fallback={<FeedSkeleton />}>
        <Feed userId={profile.id} category={category} search={search} canMod={canModerate(profile)} />
      </Suspense>
    </div>
  );
}

async function Feed({
  userId,
  category,
  search,
  canMod,
}: {
  userId: string;
  category: PostCategory | "all";
  search: string;
  canMod: boolean;
}) {
  const posts = await getFeedPosts({ userId, category, search });
  if (posts.length === 0) {
    return (
      <EmptyState
        icon={MessageSquareText}
        title="Nada por aqui"
        description="Não encontramos publicações com os filtros atuais."
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
