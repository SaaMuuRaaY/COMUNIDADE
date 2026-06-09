"use client";

import * as React from "react";
import { ConfirmDeleteIconButton } from "@/components/shared/confirm-delete-icon-button";
import { deletePostAction } from "@/server/actions/posts";
import { toast } from "sonner";

export function DeletePostInline({ postId }: { postId: string }) {
  const [pending, startTransition] = React.useTransition();

  function handle() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deletePostAction(postId);
        if (!res.ok) toast.error(res.error ?? "Erro");
        else toast.success("Post excluído.");
        resolve();
      });
    });
  }

  return (
    <ConfirmDeleteIconButton
      onConfirm={handle}
      title="Excluir post?"
      description="O post será marcado como removido. Não pode ser desfeito."
      pending={pending}
      ariaLabel="Excluir post"
    />
  );
}
