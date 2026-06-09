"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { Markdown } from "@/components/shared/markdown";
import { formatRelative } from "@/lib/utils";
import { createCommentAction, deleteCommentAction } from "@/server/actions/posts";
import { toast } from "sonner";
import { ConfirmDeleteIconButton } from "@/components/shared/confirm-delete-icon-button";
import type { CommentRow } from "@/server/queries/posts";

function DeleteCommentButton({
  commentId,
  pending,
  startTransition,
}: {
  commentId: string;
  pending: boolean;
  startTransition: React.TransitionStartFunction;
}) {
  function handle() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteCommentAction(commentId);
        if (!res.ok) toast.error(res.error ?? "Erro ao excluir.");
        else toast.success("Comentário removido.");
        resolve();
      });
    });
  }
  return (
    <span className="ml-auto">
      <ConfirmDeleteIconButton
        onConfirm={handle}
        title="Excluir comentário?"
        description="Esta ação não pode ser desfeita."
        pending={pending}
        ariaLabel="Excluir comentário"
      />
    </span>
  );
}

type Props = {
  postId: string;
  comments: CommentRow[];
  currentUserId: string;
  canModerate: boolean;
};

export function CommentList({ postId, comments, currentUserId, canModerate }: Props) {
  const [body, setBody] = React.useState("");
  const [pending, startTransition] = React.useTransition();

  function submit() {
    if (body.trim().length < 1) return;
    const fd = new FormData();
    fd.append("post_id", postId);
    fd.append("body", body);
    startTransition(async () => {
      const res = await createCommentAction(fd);
      if (!res.ok) toast.error(res.error ?? "Erro ao comentar.");
      else {
        toast.success("Comentário enviado.");
        setBody("");
      }
    });
  }

  return (
    <div className="space-y-3">
      <Card>
        <CardContent className="space-y-2 p-4">
          <Textarea
            rows={3}
            placeholder="Adicione um comentário…"
            value={body}
            onChange={(e) => setBody(e.target.value)}
          />
          <div className="flex justify-end">
            <Button onClick={submit} disabled={pending || !body.trim()}>
              {pending ? "Enviando…" : "Comentar"}
            </Button>
          </div>
        </CardContent>
      </Card>

      {comments.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Sem comentários ainda. Seja o primeiro.
        </p>
      ) : (
        comments.map((c) => {
          const isOwner = c.author?.id === currentUserId;
          return (
            <Card key={c.id}>
              <CardContent className="space-y-2 p-4">
                <div className="flex items-center gap-2">
                  <UserAvatar
                    name={c.author?.full_name}
                    src={c.author?.avatar_url}
                    className="h-7 w-7"
                  />
                  <span className="text-sm font-medium">{c.author?.full_name ?? "Membro"}</span>
                  {c.author ? <LevelBadge level={c.author.level} /> : null}
                  <span className="text-xs text-muted-foreground">· {formatRelative(c.created_at)}</span>
                  {(isOwner || canModerate) && (
                    <DeleteCommentButton
                      commentId={c.id}
                      pending={pending}
                      startTransition={startTransition}
                    />
                  )}
                </div>
                <Markdown>{c.body}</Markdown>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
