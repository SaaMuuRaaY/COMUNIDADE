import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community/post-card";
import { CommentList } from "@/components/community/comment-list";
import { requireProfile } from "@/lib/auth/current-user";
import { canModerate } from "@/lib/permissions/policies";
import { getPostById, getCommentsByPost } from "@/server/queries/posts";

type Params = Promise<{ postId: string }>;

export default async function PostDetailPage({ params }: { params: Params }) {
  const { postId } = await params;
  const profile = await requireProfile();
  const [post, comments] = await Promise.all([
    getPostById(postId, profile.id),
    getCommentsByPost(postId),
  ]);
  if (!post) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link href="/community">
          <ArrowLeft className="h-4 w-4" /> Voltar para o feed
        </Link>
      </Button>
      <PostCard post={post} currentUserId={profile.id} canModerate={canModerate(profile)} />
      <CommentList
        postId={post.id}
        comments={comments}
        currentUserId={profile.id}
        canModerate={canModerate(profile)}
      />
    </div>
  );
}
