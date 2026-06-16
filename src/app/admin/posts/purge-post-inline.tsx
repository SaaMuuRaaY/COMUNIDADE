"use client";

import * as React from "react";
import { ConfirmDeleteIconButton } from "@/components/shared/confirm-delete-icon-button";
import { purgePostAction } from "@/server/actions/posts";
import { toast } from "sonner";

export function PurgePostInline({ postId }: { postId: string }) {
  const [pending, startTransition] = React.useTransition();

  function handle() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await purgePostAction(postId);
        if (!res.ok) toast.error(res.error ?? "Erro");
        else toast.success("Post removido permanentemente.");
        resolve();
      });
    });
  }

  return (
    <ConfirmDeleteIconButton
      onConfirm={handle}
      title="Excluir permanentemente?"
      description="O post e seus comentários, curtidas e reações serão apagados do banco. Esta ação NÃO pode ser desfeita."
      confirmLabel="Excluir de vez"
      pending={pending}
      ariaLabel="Excluir permanentemente"
    />
  );
}
