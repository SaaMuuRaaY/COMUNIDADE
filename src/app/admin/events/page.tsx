import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import { EventComposer, DeleteEventInline } from "./event-actions";

export const metadata = { title: "Eventos · Admin" };

export default async function AdminEventsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("events").select("*").order("starts_at");
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Eventos</h1>
      <EventComposer />
      {items.length === 0 ? (
        <EmptyState title="Sem eventos" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((e) => (
                <li key={e.id as string} className="flex items-start justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{e.event_type as string}</Badge>
                      <p className="font-medium">{e.title as string}</p>
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {new Date(e.starts_at as string).toLocaleString("pt-BR", {
                        dateStyle: "medium",
                        timeStyle: "short",
                      })}
                    </p>
                  </div>
                  <DeleteEventInline id={e.id as string} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
