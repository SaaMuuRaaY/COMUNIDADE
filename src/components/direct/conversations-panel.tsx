"use client";

import * as React from "react";
import Link from "next/link";
import { UserAvatar } from "@/components/shared/user-avatar";
import { cn, formatRelative } from "@/lib/utils";
import { getConversationsPreview } from "@/server/actions/direct-messages";
import type { DMConversationSummary } from "@/server/queries/direct-messages";

// Prévia das conversas dentro do painel rápido do header. Carrega on-open.
export function ConversationsPanel() {
  const [items, setItems] = React.useState<DMConversationSummary[] | null>(null);

  React.useEffect(() => {
    let active = true;
    getConversationsPreview()
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

  if (items === null) {
    return <p className="p-4 text-center text-sm text-muted-foreground">Carregando…</p>;
  }
  if (items.length === 0) {
    return <p className="p-4 text-center text-sm text-muted-foreground">Nenhuma conversa ainda.</p>;
  }

  return (
    <ul className="divide-y">
      {items.map((c) => (
        <li key={c.id}>
          <Link
            href={`/mensagens/${c.id}`}
            className="flex items-center gap-2.5 p-2.5 transition-colors hover:bg-accent/50"
          >
            <UserAvatar name={c.other?.full_name} src={c.other?.avatar_url} className="h-8 w-8 shrink-0" />
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline justify-between gap-2">
                <span className="truncate text-sm font-medium">{c.other?.full_name ?? "Membro"}</span>
                <span className="shrink-0 text-[11px] text-muted-foreground">
                  {formatRelative(c.last_message_at)}
                </span>
              </div>
              <p
                className={cn(
                  "truncate text-xs",
                  c.unread ? "font-medium text-foreground" : "text-muted-foreground",
                )}
              >
                {c.lastMessage
                  ? c.lastMessage.is_deleted
                    ? "mensagem removida"
                    : `${c.lastMessage.mine ? "Você: " : ""}${c.lastMessage.body}`
                  : "Sem mensagens"}
              </p>
            </div>
            {c.unread ? (
              <span className="h-2 w-2 shrink-0 rounded-full bg-[var(--accent)]" aria-label="não lida" />
            ) : null}
          </Link>
        </li>
      ))}
    </ul>
  );
}
