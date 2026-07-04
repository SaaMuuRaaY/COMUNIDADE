"use client";

import * as React from "react";
import { cn, formatRelative } from "@/lib/utils";
import { getNotificationsPreview } from "@/server/actions/notifications";
import type { Notification } from "@/server/queries/notifications";

// Prévia das notificações no painel do sino (header). Carrega on-open.
export function NotificationsPanel() {
  const [items, setItems] = React.useState<Notification[] | null>(null);

  React.useEffect(() => {
    let active = true;
    getNotificationsPreview()
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
    return <p className="p-4 text-center text-sm text-muted-foreground">Nada de novo por aqui.</p>;
  }

  return (
    <ul className="divide-y">
      {items.map((n) => (
        <li key={n.id} className={cn("p-3", !n.read_at && "bg-[var(--accent-soft)]")}>
          <div className="flex items-baseline justify-between gap-2">
            <span className="text-sm font-medium">{n.title}</span>
            <span className="shrink-0 text-[11px] text-muted-foreground">
              {formatRelative(n.created_at)}
            </span>
          </div>
          {n.body ? <p className="text-xs text-muted-foreground">{n.body}</p> : null}
        </li>
      ))}
    </ul>
  );
}
