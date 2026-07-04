"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { Check, X } from "lucide-react";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Button } from "@/components/ui/button";
import { UserAvatar } from "@/components/shared/user-avatar";
import { acceptFriendRequest, declineFriendRequest } from "@/server/actions/connections";
import type { ConnectionProfile } from "@/server/queries/connections";
import { toast } from "sonner";

type Pending = ConnectionProfile & { requestedAt: string };

function MemberRow({ p, action }: { p: ConnectionProfile; action?: React.ReactNode }) {
  return (
    <li className="flex items-center gap-3 p-3">
      <UserAvatar name={p.full_name} src={p.avatar_url} className="h-9 w-9 shrink-0" />
      <Link href={`/members/${p.id}`} className="min-w-0 flex-1">
        <p className="truncate text-sm font-medium hover:underline">{p.full_name ?? "Membro"}</p>
        {p.username ? <p className="truncate text-xs text-muted-foreground">@{p.username}</p> : null}
      </Link>
      {action}
    </li>
  );
}

function List({ items, empty }: { items: ConnectionProfile[]; empty: string }) {
  if (!items.length) return <p className="p-6 text-center text-sm text-muted-foreground">{empty}</p>;
  return (
    <ul className="divide-y">
      {items.map((p) => (
        <MemberRow key={p.id} p={p} />
      ))}
    </ul>
  );
}

export function ConnectionsTabs({
  following,
  followers,
  friends,
  requests,
}: {
  following: ConnectionProfile[];
  followers: ConnectionProfile[];
  friends: ConnectionProfile[];
  requests: Pending[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [reqs, setReqs] = React.useState(requests);

  function respond(userId: string, accept: boolean) {
    setReqs((r) => r.filter((x) => x.id !== userId));
    startTransition(async () => {
      const res = accept ? await acceptFriendRequest(userId) : await declineFriendRequest(userId);
      if (!res.ok) {
        toast.error(res.error ?? "Erro.");
        setReqs(requests);
      } else {
        router.refresh();
      }
    });
  }

  const box = "mt-3 overflow-hidden rounded-xl border bg-card";

  return (
    <Tabs defaultValue={requests.length ? "requests" : "friends"}>
      <TabsList className="grid w-full grid-cols-4">
        <TabsTrigger value="friends">Amigos</TabsTrigger>
        <TabsTrigger value="requests">Solicitações{reqs.length ? ` (${reqs.length})` : ""}</TabsTrigger>
        <TabsTrigger value="following">Seguindo</TabsTrigger>
        <TabsTrigger value="followers">Seguidores</TabsTrigger>
      </TabsList>

      <TabsContent value="friends" className={box}>
        <List items={friends} empty="Nenhum amigo ainda." />
      </TabsContent>

      <TabsContent value="requests" className={box}>
        {reqs.length === 0 ? (
          <p className="p-6 text-center text-sm text-muted-foreground">Nenhuma solicitação pendente.</p>
        ) : (
          <ul className="divide-y">
            {reqs.map((p) => (
              <MemberRow
                key={p.id}
                p={p}
                action={
                  <div className="flex gap-1.5">
                    <Button size="sm" disabled={pending} onClick={() => respond(p.id, true)} className="gap-1">
                      <Check className="h-4 w-4" /> Aceitar
                    </Button>
                    <Button
                      size="sm"
                      variant="ghost"
                      disabled={pending}
                      onClick={() => respond(p.id, false)}
                      aria-label="Recusar"
                    >
                      <X className="h-4 w-4" />
                    </Button>
                  </div>
                }
              />
            ))}
          </ul>
        )}
      </TabsContent>

      <TabsContent value="following" className={box}>
        <List items={following} empty="Não está seguindo ninguém." />
      </TabsContent>

      <TabsContent value="followers" className={box}>
        <List items={followers} empty="Nenhum seguidor ainda." />
      </TabsContent>
    </Tabs>
  );
}
