import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import { ResourceComposer, DeleteResourceInline } from "./resource-actions";

export const metadata = { title: "Recursos · Admin" };

export default async function AdminResourcesPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Recursos</h1>
      <ResourceComposer />
      {items.length === 0 ? (
        <EmptyState title="Sem recursos" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((r) => (
                <li key={r.id as string} className="flex items-start justify-between p-4">
                  <div className="min-w-0 flex-1 space-y-1">
                    <div className="flex items-center gap-2">
                      <Badge variant="secondary">{r.category as string}</Badge>
                      <p className="font-medium">{r.title as string}</p>
                    </div>
                    {r.description ? (
                      <p className="line-clamp-2 text-sm text-muted-foreground">{r.description as string}</p>
                    ) : null}
                  </div>
                  <DeleteResourceInline id={r.id as string} />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
