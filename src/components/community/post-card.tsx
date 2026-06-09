"use client";

import Link from "next/link";
import * as React from "react";
import { Heart, MessageCircle, MoreHorizontal, Trash2 } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { RoleBadge } from "@/components/shared/role-badge";
import { Markdown } from "@/components/shared/markdown";
import { formatRelative } from "@/lib/utils";
import { POST_CATEGORIES } from "@/lib/constants";
import { togglePostLikeAction, deletePostAction } from "@/server/actions/posts";
import { toast } from "sonner";
import type { FeedPost } from "@/server/queries/posts";

type Props = {
  post: FeedPost;
  currentUserId: string;
  canModerate: boolean;
};

export function PostCard({ post, currentUserId, canModerate }: Props) {
  const [liked, setLiked] = React.useState(post.liked_by_me);
  const [likesCount, setLikesCount] = React.useState(post.likes_count);
  const [pending, startTransition] = React.useTransition();
  const [confirmOpen, setConfirmOpen] = React.useState(false);
  const cat = POST_CATEGORIES.find((c) => c.value === post.category);
  const isOwner = post.author?.id === currentUserId;

  async function onLike() {
    setLiked((v) => !v);
    setLikesCount((c) => c + (liked ? -1 : 1));
    startTransition(async () => {
      const res = await togglePostLikeAction(post.id);
      if (!res.ok) {
        // rollback
        setLiked((v) => !v);
        setLikesCount((c) => c + (liked ? 1 : -1));
        toast.error(res.error ?? "Erro ao curtir.");
      }
    });
  }

  function onDelete() {
    startTransition(async () => {
      const res = await deletePostAction(post.id);
      if (!res.ok) toast.error(res.error ?? "Erro ao excluir.");
      else toast.success("Publicação removida.");
      setConfirmOpen(false);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="flex items-start gap-3">
          <UserAvatar
            name={post.author?.full_name}
            src={post.author?.avatar_url}
            className="h-10 w-10"
          />
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center gap-2 text-sm">
              <Link
                href={post.author ? `/members/${post.author.id}` : "#"}
                className="font-medium hover:underline"
              >
                {post.author?.full_name ?? "Membro"}
              </Link>
              <RoleBadge role={post.author?.role ?? "member"} />
              {post.author ? <LevelBadge level={post.author.level} /> : null}
              {cat ? (
                <Badge variant="secondary" className="text-[10px]">
                  {cat.label}
                </Badge>
              ) : null}
              <span className="text-xs text-muted-foreground">· {formatRelative(post.created_at)}</span>
            </div>
          </div>
          {(isOwner || canModerate) && (
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <Button variant="ghost" size="icon" className="h-8 w-8">
                  <MoreHorizontal className="h-4 w-4" />
                </Button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end">
                <DropdownMenuItem
                  onSelect={(e) => {
                    e.preventDefault();
                    setConfirmOpen(true);
                  }}
                  className="text-destructive"
                >
                  <Trash2 className="mr-2 h-4 w-4" /> Excluir
                </DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          )}
        </div>

        {post.title ? <h3 className="font-semibold leading-snug">{post.title}</h3> : null}
        <Markdown>{post.body}</Markdown>

        {post.media_url ? (
          post.media_type?.startsWith("video/") ? (
            <video
              src={post.media_url}
              controls
              className="w-full rounded-md"
              aria-label={post.title ?? "Vídeo da publicação"}
            />
          ) : (
            // eslint-disable-next-line @next/next/no-img-element
            <img
              src={post.media_url}
              alt={post.title ?? `Mídia da publicação de ${post.author?.full_name ?? "membro"}`}
              className="w-full rounded-md object-cover"
            />
          )
        ) : null}

        {post.attachment_url ? (
          <a
            href={post.attachment_url}
            target="_blank"
            rel="noopener noreferrer"
            className="inline-flex text-xs text-primary hover:underline"
          >
            📎 Baixar anexo
          </a>
        ) : null}

        <div className="flex items-center gap-2 pt-1">
          <Button
            variant={liked ? "default" : "outline"}
            size="sm"
            onClick={onLike}
            disabled={pending}
            className="gap-2"
          >
            <Heart className={`h-4 w-4 ${liked ? "fill-current" : ""}`} />
            {likesCount}
          </Button>
          <Button asChild variant="ghost" size="sm" className="gap-2">
            <Link href={`/community/${post.id}`}>
              <MessageCircle className="h-4 w-4" />
              {post.comments_count}
            </Link>
          </Button>
        </div>
      </CardContent>

      <Dialog open={confirmOpen} onOpenChange={setConfirmOpen}>
        <DialogContent>
          <DialogHeader>
            <DialogTitle>Excluir publicação?</DialogTitle>
            <DialogDescription>
              A publicação será marcada como removida. Esta ação não pode ser desfeita.
            </DialogDescription>
          </DialogHeader>
          <DialogFooter className="gap-2">
            <Button variant="ghost" onClick={() => setConfirmOpen(false)} disabled={pending}>
              Cancelar
            </Button>
            <Button variant="destructive" onClick={onDelete} disabled={pending}>
              {pending ? "Excluindo…" : "Excluir"}
            </Button>
          </DialogFooter>
        </DialogContent>
      </Dialog>
    </Card>
  );
}
