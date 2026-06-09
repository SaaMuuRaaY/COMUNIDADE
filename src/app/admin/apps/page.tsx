import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import { AppComposer, DeleteAppInline } from "./app-actions";

export const metadata = { title: "Apps · Admin" };

export default async function AdminAppsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("apps").select("*").order("created_at", { ascending: false });
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Aplicativos</h1>
      <AppComposer />
      {items.length === 0 ? (
        <EmptyState title="Sem apps cadastrados" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((a) => (
                <li key={a.id as string} className="flex items-start justify-between p-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="outline">{a.category as string}</Badge>
                      <Badge>{a.type as string}</Badge>
                      <Badge variant="secondary">{a.status as string}</Badge>
                    </div>
                    <p className="font-medium">{a.name as string}</p>
                    {a.url ? (
                      <p className="text-xs text-muted-foreground">{a.url as string}</p>
                    ) : null}
                  </div>
                  <DeleteAppInline id={a.id as string} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
