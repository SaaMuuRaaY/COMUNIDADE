import { Calendar, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { RsvpButton } from "@/components/calendar/rsvp-button";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { EVENT_TYPES } from "@/lib/constants";

import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";

export const metadata = { title: "Calendário" };

export default async function CalendarPage() {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: events } = await supabase
    .from("events")
    .select("*")
    .order("starts_at", { ascending: true });

  const { data: myRsvps } = await supabase
    .from("event_attendees")
    .select("event_id")
    .eq("user_id", profile.id)
    .eq("status", "going");
  const goingSet = new Set<string>((myRsvps ?? []).map((r) => r.event_id as string));

  const items = events ?? [];

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.calendar} />

      {items.length === 0 ? (
        <EmptyState icon={Calendar} title="Sem eventos agendados" />
      ) : (
        <div className="space-y-3">
          {items.map((e) => {
            const type = EVENT_TYPES.find((t) => t.value === e.event_type);
            const date = new Date(e.starts_at as string);
            // eslint-disable-next-line react-hooks/purity
            const past = date.getTime() < Date.now();
            return (
              <Card key={e.id as string} className={past ? "opacity-70" : ""}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-start justify-between gap-3">
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <Badge variant="secondary">{type?.label ?? e.event_type}</Badge>
                        {past ? <Badge variant="outline">Encerrado</Badge> : null}
                      </div>
                      <h3 className="font-semibold leading-tight">{e.title as string}</h3>
                      <p className="text-xs text-muted-foreground">
                        {date.toLocaleString("pt-BR", {
                          timeZone: "America/Asuncion",
                          dateStyle: "medium",
                          timeStyle: "short",
                        })}
                      </p>
                    </div>
                    {!past ? (
                      <RsvpButton eventId={e.id as string} initiallyGoing={goingSet.has(e.id as string)} />
                    ) : null}
                  </div>
                  {e.description ? (
                    <p className="text-sm text-muted-foreground">{e.description as string}</p>
                  ) : null}
                  {e.external_url ? (
                    <a
                      href={e.external_url as string}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-xs text-primary hover:underline"
                    >
                      Link do evento <ExternalLink className="h-3 w-3" />
                    </a>
                  ) : null}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
