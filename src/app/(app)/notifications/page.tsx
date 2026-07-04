import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { cn, formatRelative } from "@/lib/utils";
import { getNotifications } from "@/server/queries/notifications";
import { MarkAllReadButton } from "@/components/notifications/mark-all-read";

export const metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const items = await getNotifications(50);
  const hasUnread = items.some((n) => !n.read_at);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="flex items-start justify-between gap-3">
        <div className="space-y-1">
          <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
            <Bell className="h-5 w-5" /> Notificações
          </h1>
          <p className="text-sm text-muted-foreground">Atualizações importantes para você.</p>
        </div>
        {hasUnread ? <MarkAllReadButton /> : null}
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Nada de novo por aqui" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((n) => (
                <li
                  key={n.id}
                  className={cn("space-y-1 p-4", !n.read_at && "bg-[var(--accent-soft)]")}
                >
                  <div className="flex items-center justify-between gap-2">
                    <p className="font-medium">{n.title}</p>
                    <span className="shrink-0 text-xs text-muted-foreground">
                      {formatRelative(n.created_at)}
                    </span>
                  </div>
                  {n.body ? <p className="text-sm text-muted-foreground">{n.body}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
