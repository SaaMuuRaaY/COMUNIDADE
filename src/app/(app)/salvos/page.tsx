import { Bookmark } from "lucide-react";
import { SectionBanner } from "@/components/shared/section-banner";
import { EmptyState } from "@/components/shared/empty-state";
import { PostCard } from "@/components/community/post-card";
import { requireActiveProfile } from "@/lib/auth/current-user";
import { canModerate } from "@/lib/permissions/policies";
import { getSavedPosts } from "@/server/queries/posts";

export const metadata = { title: "Salvos · Comunidade" };

// FEATURE 04 Fase 3 — publicações salvas (bookmarks privados).
export default async function SalvosPage() {
  const profile = await requireActiveProfile();
  const posts = await getSavedPosts(profile.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner
        icon={Bookmark}
        eyebrow="Biblioteca"
        title="Salvos"
        description="Publicações que você salvou para ver depois."
        variant="featured"
      />

      {posts.length === 0 ? (
        <EmptyState
          icon={Bookmark}
          title="Nada salvo ainda"
          description="Toque no marcador de uma publicação para salvá-la aqui."
        />
      ) : (
        <div className="space-y-4">
          {posts.map((p) => (
            <PostCard
              key={p.id}
              post={p}
              currentUserId={profile.id}
              canModerate={canModerate(profile)}
              role={profile.role}
            />
          ))}
        </div>
      )}
    </div>
  );
}
