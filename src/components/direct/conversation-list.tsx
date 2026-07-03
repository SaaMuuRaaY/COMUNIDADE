"use client";

import * as React from "react";
import Link from "next/link";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatRelative } from "@/lib/utils";
import { cn } from "@/lib/utils";
import type { DMConversationSummary } from "@/server/queries/direct-messages";

// Inbox de DMs. Realtime em dm_conversations (RLS limita às minhas): qualquer
// mudança (nova conversa ou nova mensagem -> last_message_at) recarrega a lista.
export function ConversationList({ conversations }: { conversations: DMConversationSummary[] }) {
  const router = useRouter();
  const [supabase] = React.useState(() => createClient());

  React.useEffect(() => {
    const channel = supabase
      .channel("dm-inbox")
      .on(
        "postgres_changes",
        { event: "*", schema: "public", table: "dm_conversations" },
        () => router.refresh(),
      )
      .subscribe();
    return () => {
      supabase.removeChannel(channel);
    };
  }, [supabase, router]);

  if (conversations.length === 0) {
    return (
      <p className="rounded-xl border bg-card py-10 text-center text-sm text-muted-foreground">
        Nenhuma conversa ainda. Comece uma nova!
      </p>
    );
  }

  return (
    <div className="divide-y overflow-hidden rounded-xl border bg-card">
      {conversations.map((c) => (
        <Link
          key={c.id}
          href={`/mensagens/${c.id}`}
          className="flex items-center gap-3 p-3 transition-colors hover:bg-accent/50"
        >
          <UserAvatar name={c.other?.full_name} src={c.other?.avatar_url} className="h-10 w-10 shrink-0" />
          <div className="min-w-0 flex-1">
            <div className="flex items-baseline justify-between gap-2">
              <span className="truncate text-sm font-medium">{c.other?.full_name ?? "Membro"}</span>
              <span className="shrink-0 text-xs text-muted-foreground">
                {formatRelative(c.last_message_at)}
              </span>
            </div>
            <p
              className={cn(
                "truncate text-sm",
                c.unread ? "font-medium text-foreground" : "text-muted-foreground",
              )}
            >
              {c.lastMessage
                ? c.lastMessage.is_deleted
                  ? "mensagem removida"
                  : `${c.lastMessage.mine ? "Você: " : ""}${c.lastMessage.body}`
                : "Sem mensagens ainda"}
            </p>
          </div>
          {c.unread ? (
            <span className="h-2.5 w-2.5 shrink-0 rounded-full bg-[var(--accent)]" aria-label="não lida" />
          ) : null}
        </Link>
      ))}
    </div>
  );
}
