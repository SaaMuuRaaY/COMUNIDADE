"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { markAllNotificationsRead } from "@/server/actions/notifications";
import { toast } from "sonner";

export function MarkAllReadButton() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  return (
    <Button
      variant="ghost"
      size="sm"
      disabled={pending}
      onClick={() =>
        startTransition(async () => {
          const res = await markAllNotificationsRead();
          if (!res.ok) {
            toast.error(res.error ?? "Erro ao marcar como lidas.");
            return;
          }
          router.refresh();
        })
      }
    >
      Marcar todas como lidas
    </Button>
  );
}
