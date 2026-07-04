import { createClient } from "@/lib/supabase/server";

export type UpcomingEvent = {
  id: string;
  title: string;
  starts_at: string;
  ends_at: string | null;
  event_type: string;
  external_url: string | null;
};

/**
 * Proximos eventos (starts_at no futuro), do mais proximo pro mais distante.
 * Reusa o padrao ja usado no dashboard (gte starts_at). Usado pelo painel de
 * descoberta do /community e podera substituir a query inline do dashboard.
 */
export async function getUpcomingEvents(limit = 5): Promise<UpcomingEvent[]> {
  const supabase = await createClient();
  const nowIso = new Date().toISOString();
  const { data } = await supabase
    .from("events")
    .select("id, title, starts_at, ends_at, event_type, external_url")
    .gte("starts_at", nowIso)
    .order("starts_at", { ascending: true })
    .limit(limit);
  return (data ?? []) as UpcomingEvent[];
}
