"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { UserPlus, UserCheck, Clock, Check, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  followUser,
  unfollowUser,
  sendFriendRequest,
  cancelFriendRequest,
  acceptFriendRequest,
  declineFriendRequest,
  removeFriend,
} from "@/server/actions/connections";
import type { ConnectionState, FriendshipState } from "@/server/queries/connections";
import { toast } from "sonner";

export function ConnectionButtons({ userId, initial }: { userId: string; initial: ConnectionState }) {
  const router = useRouter();
  const [state, setState] = React.useState(initial);
  const [pending, startTransition] = React.useTransition();

  function run(
    action: () => Promise<{ ok: boolean; error?: string }>,
    optimistic: () => void,
    rollback: () => void,
  ) {
    optimistic();
    startTransition(async () => {
      const res = await action();
      if (!res.ok) {
        rollback();
        toast.error(res.error ?? "Erro.");
      } else {
        router.refresh();
      }
    });
  }

  const setFriend = (f: FriendshipState) => setState((s) => ({ ...s, friendship: f }));

  function toggleFollow() {
    const was = state.isFollowing;
    run(
      () => (was ? unfollowUser(userId) : followUser(userId)),
      () => setState((s) => ({ ...s, isFollowing: !was })),
      () => setState((s) => ({ ...s, isFollowing: was })),
    );
  }

  return (
    <div className="flex flex-wrap gap-2 pt-1">
      <Button
        variant={state.isFollowing ? "secondary" : "default"}
        size="sm"
        onClick={toggleFollow}
        disabled={pending}
        className="gap-2"
      >
        {state.isFollowing ? (
          <>
            <UserCheck className="h-4 w-4" /> Seguindo
          </>
        ) : (
          <>
            <UserPlus className="h-4 w-4" /> Seguir
          </>
        )}
      </Button>

      {state.friendship === "none" ? (
        <Button
          variant="outline"
          size="sm"
          disabled={pending}
          className="gap-2"
          onClick={() =>
            run(() => sendFriendRequest(userId), () => setFriend("pending_sent"), () => setFriend("none"))
          }
        >
          <UserPlus className="h-4 w-4" /> Adicionar amigo
        </Button>
      ) : state.friendship === "pending_sent" ? (
        <Button
          variant="ghost"
          size="sm"
          disabled={pending}
          className="gap-2"
          title="Cancelar solicitação"
          onClick={() =>
            run(() => cancelFriendRequest(userId), () => setFriend("none"), () => setFriend("pending_sent"))
          }
        >
          <Clock className="h-4 w-4" /> Solicitação enviada
        </Button>
      ) : state.friendship === "pending_received" ? (
        <>
          <Button
            variant="default"
            size="sm"
            disabled={pending}
            className="gap-2"
            onClick={() =>
              run(() => acceptFriendRequest(userId), () => setFriend("friends"), () => setFriend("pending_received"))
            }
          >
            <Check className="h-4 w-4" /> Aceitar
          </Button>
          <Button
            variant="ghost"
            size="sm"
            disabled={pending}
            className="gap-2"
            onClick={() =>
              run(() => declineFriendRequest(userId), () => setFriend("none"), () => setFriend("pending_received"))
            }
          >
            <X className="h-4 w-4" /> Recusar
          </Button>
        </>
      ) : (
        <Button
          variant="secondary"
          size="sm"
          disabled={pending}
          className="gap-2"
          title="Desfazer amizade"
          onClick={() => run(() => removeFriend(userId), () => setFriend("none"), () => setFriend("friends"))}
        >
          <UserCheck className="h-4 w-4" /> Amigos
        </Button>
      )}
    </div>
  );
}
