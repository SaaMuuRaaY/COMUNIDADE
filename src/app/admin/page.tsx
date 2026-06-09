import {
  Calendar,
  GraduationCap,
  LayoutGrid,
  Library,
  MessageSquareText,
  Users,
} from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Admin" };

async function countTable(table: string): Promise<number> {
  const supabase = await createClient();
  const { count } = await supabase.from(table).select("id", { count: "exact", head: true });
  return count ?? 0;
}

export default async function AdminOverviewPage() {
  const [members, posts, courses, lessons, resources, apps, eventsCount] = await Promise.all([
    countTable("profiles"),
    countTable("posts"),
    countTable("courses"),
    countTable("lessons"),
    countTable("resources"),
    countTable("apps"),
    countTable("events"),
  ]);

  const supabase = await createClient();
  const { data: upcomingEvents } = await supabase
    .from("events")
    .select("id, title, starts_at")
    .gte("starts_at", new Date().toISOString())
    .order("starts_at")
    .limit(5);

  const cards = [
    { label: "Membros", value: members, icon: Users },
    { label: "Posts", value: posts, icon: MessageSquareText },
    { label: "Cursos", value: courses, icon: GraduationCap },
    { label: "Aulas", value: lessons, icon: GraduationCap },
    { label: "Recursos", value: resources, icon: Library },
    { label: "Apps", value: apps, icon: LayoutGrid },
    { label: "Eventos", value: eventsCount, icon: Calendar },
  ];

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Visão geral</h1>
        <p className="text-sm text-muted-foreground">Estatísticas e atividade da comunidade.</p>
      </div>

      <div className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {cards.map((c) => (
          <Card key={c.label}>
            <CardContent className="flex items-center justify-between p-5">
              <div>
                <p className="text-xs uppercase tracking-wide text-muted-foreground">{c.label}</p>
                <p className="text-2xl font-semibold">{c.value}</p>
              </div>
              <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted">
                <c.icon className="h-5 w-5" />
              </div>
            </CardContent>
          </Card>
        ))}
      </div>

      <Card>
        <CardContent className="space-y-3 p-5">
          <h2 className="font-semibold">Próximos eventos</h2>
          {!upcomingEvents || upcomingEvents.length === 0 ? (
            <p className="text-sm text-muted-foreground">Nenhum evento agendado.</p>
          ) : (
            <ul className="space-y-2 text-sm">
              {upcomingEvents.map((e) => (
                <li key={e.id as string} className="flex items-center justify-between">
                  <span>{e.title as string}</span>
                  <span className="text-xs text-muted-foreground">
                    {new Date(e.starts_at as string).toLocaleString("pt-BR", {
                      dateStyle: "short",
                      timeStyle: "short",
                    })}
                  </span>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
