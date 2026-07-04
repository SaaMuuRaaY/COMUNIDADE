"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import {
  getPendingRequestsPreview,
  acceptFriendRequest,
  declineFriendRequest,
} from "@/server/actions/connections";
import type { ConnectionProfile } from "@/server/queries/connections";
import { toast } from "sonner";

type Pending = ConnectionProfile & { requestedAt: string };

// Solicitações de amizade pendentes no painel do header (Conexões). Carrega on-open.
export function RequestsPanel() {
  const router = useRouter();
  const [items, setItems] = React.useState<Pending[] | null>(null);
  const [pending, startTransition] = React.useTransition();

  React.useEffect(() => {
    let active = true;
    getPendingRequestsPreview()
      .then((r) => {
        if (active) setItems(r);
      })
      .catch(() => {
        if (active) setItems([]);
      });
    return () => {
      active = false;
    };
  }, []);

  function respond(userId: string, accept: boolean) {
    const snapshot = items;
    setItems((r) => (r ?? []).filter((x) => x.id !== userId));
    startTransition(async () => {
      const res = accept ? await acceptFriendRequest(userId) : await declineFriendRequest(userId);
      if (!res.ok) {
        toast.error(res.error ?? "Erro.");
        setItems(snapshot);
      } else {
        router.refresh();
      }
    });
  }

  if (items === null) {
    return <p className="p-4 text-center text-sm text-muted-foreground">Carregando…</p>;
  }
  if (items.length === 0) {
    return <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>;
  }

  return (
    <ul className="divide-y">
      {items.map((p) => (
        <li key={p.id} className="flex items-center gap-2.5 p-2.5">
          <Link href={`/members/${p.id}`}>
            <UserAvatar name={p.full_name} src={p.avatar_url} className="h-8 w-8 shrink-0" />
          </Link>
          <Link href={`/members/${p.id}`} className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium hover:underline">{p.full_name ?? "Membro"}</p>
            <p className="text-xs text-muted-foreground">quer ser seu amigo</p>
          </Link>
          <div className="flex gap-1">
            <Button
              size="icon"
              className="h-7 w-7"
              disabled={pending}
              onClick={() => respond(p.id, true)}
              aria-label="Aceitar"
            >
              <Check className="h-4 w-4" />
            </Button>
            <Button
              size="icon"
              variant="ghost"
              className="h-7 w-7"
              disabled={pending}
              onClick={() => respond(p.id, false)}
              aria-label="Recusar"
            >
              <X className="h-4 w-4" />
            </Button>
          </div>
        </li>
      ))}
    </ul>
  );
}
