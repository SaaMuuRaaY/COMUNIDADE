import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { Button } from "@/components/ui/button";
import { PostCard } from "@/components/community/post-card";
import { CommentList } from "@/components/community/comment-list";
import { requireProfile } from "@/lib/auth/current-user";
import { canModerate } from "@/lib/permissions/policies";
import { getPostById, getCommentsByPost } from "@/server/queries/posts";
import { canCommentInChannel, isKnownChannelSlug } from "@/lib/community/structure";

type Params = Promise<{ postId: string }>;

export default async function PostDetailPage({ params }: { params: Params }) {
  const { postId } = await params;
  const profile = await requireProfile();
  const [post, comments] = await Promise.all([
    getPostById(postId, profile.id),
    getCommentsByPost(postId),
  ]);
  if (!post) notFound();

  const mod = canModerate(profile);
  const backHref = isKnownChannelSlug(post.category) ? `/community/c/${post.category}` : "/community";
  const canComment = mod || canCommentInChannel(post.category);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link href={backHref}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao canal
        </Link>
      </Button>
      <PostCard post={post} currentUserId={profile.id} canModerate={mod} />
      <CommentList
        postId={post.id}
        comments={comments}
        currentUserId={profile.id}
        canModerate={mod}
        canComment={canComment}
      />
    </div>
  );
}
