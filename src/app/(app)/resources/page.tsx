import { Library, Download, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { RESOURCE_CATEGORIES } from "@/lib/constants";

import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";

export const metadata = { title: "Recursos" };

export default async function ResourcesPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select("*")
    .order("created_at", { ascending: false });
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.resources} />

      {items.length === 0 ? (
        <EmptyState icon={Library} title="Sem recursos por enquanto" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((r) => {
            const cat = RESOURCE_CATEGORIES.find((c) => c.value === r.category);
            return (
              <Card key={r.id as string}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <Library className="h-4 w-4 text-muted-foreground" />
                    {cat ? <Badge variant="secondary">{cat.label}</Badge> : null}
                  </div>
                  <h3 className="font-semibold leading-tight">{r.title as string}</h3>
                  {r.description ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{r.description as string}</p>
                  ) : null}
                  {r.file_url ? (
                    <Button asChild size="sm" variant="outline" className="gap-2">
                      <a href={r.file_url as string} target="_blank" rel="noopener noreferrer">
                        <Download className="h-3 w-3" /> Baixar
                        <ExternalLink className="h-3 w-3" />
                      </a>
                    </Button>
                  ) : (
                    <p className="text-xs text-muted-foreground">Sem arquivo disponível.</p>
                  )}
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
