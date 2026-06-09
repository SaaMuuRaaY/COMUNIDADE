import { Bell } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Notificações" };

export default async function NotificationsPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("notifications")
    .select("*")
    .eq("user_id", profile.id)
    .order("created_at", { ascending: false })
    .limit(50);

  const items = data ?? [];

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="flex items-center gap-2 text-2xl font-semibold tracking-tight">
          <Bell className="h-5 w-5" /> Notificações
        </h1>
        <p className="text-sm text-muted-foreground">Atualizações importantes para você.</p>
      </div>

      {items.length === 0 ? (
        <EmptyState icon={Bell} title="Nada de novo por aqui" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((n) => (
                <li key={n.id as string} className="space-y-1 p-4">
                  <div className="flex items-center justify-between">
                    <p className="font-medium">{n.title as string}</p>
                    <span className="text-xs text-muted-foreground">
                      {formatRelative(n.created_at as string)}
                    </span>
                  </div>
                  {n.body ? <p className="text-sm text-muted-foreground">{n.body as string}</p> : null}
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
