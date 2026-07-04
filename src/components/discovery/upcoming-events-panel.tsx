import Link from "next/link";
import { Calendar, ArrowRight } from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { RsvpButton } from "@/components/calendar/rsvp-button";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getUpcomingEvents } from "@/server/queries/events";

/**
 * Painel de descoberta: "Proximos eventos" (Feature C F2). Reusa getUpcomingEvents
 * + RsvpButton. Vai no aside sticky do Feed Geral. Empilha no mobile.
 */
export async function UpcomingEventsPanel({ limit = 4 }: { limit?: number }) {
  const profile = await requireProfile();
  const events = await getUpcomingEvents(limit);

  let going = new Set<string>();
  if (events.length > 0) {
    const supabase = await createClient();
    const { data: rsvps } = await supabase
      .from("event_attendees")
      .select("event_id")
      .eq("user_id", profile.id)
      .eq("status", "going");
    going = new Set((rsvps ?? []).map((r) => r.event_id as string));
  }

  return (
    <Card>
      <CardHeader className="flex flex-row items-center justify-between space-y-0">
        <CardTitle className="text-base">Próximos eventos</CardTitle>
        <Button asChild variant="ghost" size="sm" className="gap-1">
          <Link href="/calendar">
            Ver todos <ArrowRight className="h-3 w-3" />
          </Link>
        </Button>
      </CardHeader>
      <CardContent className="space-y-3">
        {events.length === 0 ? (
          <EmptyState icon={Calendar} title="Nenhum evento agendado" />
        ) : (
          events.map((e) => (
            <div key={e.id} className="rounded-md border p-3">
              <p className="text-xs uppercase tracking-wide text-muted-foreground">
                {new Date(e.starts_at).toLocaleString("pt-BR", {
                  day: "2-digit",
                  month: "2-digit",
                  hour: "2-digit",
                  minute: "2-digit",
                })}
              </p>
              <p className="line-clamp-2 font-medium leading-tight">{e.title}</p>
              <div className="mt-2">
                <RsvpButton eventId={e.id} initiallyGoing={going.has(e.id)} />
              </div>
            </div>
          ))
        )}
      </CardContent>
    </Card>
  );
}
