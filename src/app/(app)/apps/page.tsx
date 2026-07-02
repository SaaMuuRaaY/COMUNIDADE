import Link from "next/link";
import { LayoutGrid, ExternalLink, Download, Boxes } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { EmptyState } from "@/components/shared/empty-state";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { APP_CATEGORIES } from "@/lib/constants";
import { isSafeEmbedUrl } from "@/lib/storage/upload";

import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";

export const metadata = { title: "Aplicativos" };

export default async function AppsPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("apps")
    .select("*")
    .order("created_at", { ascending: false });
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.apps} />

      <Link
        href="/duvidas-gerais"
        className="inline-flex text-sm text-primary hover:underline"
      >
        💬 Precisa de ajuda com um app? Pergunte na comunidade →
      </Link>

      {items.length === 0 ? (
        <EmptyState icon={LayoutGrid} title="Nenhum aplicativo cadastrado" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {items.map((a) => {
            const cat = APP_CATEGORIES.find((c) => c.value === a.category);
            const statusVariant =
              a.status === "active" ? "success" : a.status === "beta" ? "warning" : "secondary";
            return (
              <Card key={a.id as string}>
                <CardContent className="space-y-3 p-5">
                  <div className="flex items-center gap-2">
                    <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted">
                      <Boxes className="h-4 w-4" />
                    </div>
                    <div className="flex flex-1 flex-wrap items-center gap-2">
                      {cat ? <Badge variant="outline">{cat.label}</Badge> : null}
                      <Badge variant={statusVariant as "success" | "warning" | "secondary"}>
                        {a.status === "active" ? "Ativo" : a.status === "beta" ? "Beta" : "Em breve"}
                      </Badge>
                    </div>
                  </div>
                  <h3 className="font-semibold leading-tight">{a.name as string}</h3>
                  {a.description ? (
                    <p className="line-clamp-3 text-sm text-muted-foreground">{a.description as string}</p>
                  ) : null}

                  {a.type === "embed" && a.embed_url && isSafeEmbedUrl(a.embed_url as string) ? (
                    <iframe
                      src={a.embed_url as string}
                      className="aspect-video w-full rounded-md border"
                      sandbox="allow-scripts allow-forms allow-popups allow-presentation"
                      referrerPolicy="strict-origin-when-cross-origin"
                    />
                  ) : null}

                  <div className="flex gap-2">
                    {a.url ? (
                      <Button asChild size="sm" variant="outline" className="gap-2">
                        <a href={a.url as string} target="_blank" rel="noopener noreferrer">
                          Abrir <ExternalLink className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : null}
                    {a.type === "file" && a.file_url ? (
                      <Button asChild size="sm" variant="outline" className="gap-2">
                        <a href={a.file_url as string} target="_blank" rel="noopener noreferrer">
                          Baixar <Download className="h-3 w-3" />
                        </a>
                      </Button>
                    ) : null}
                  </div>
                </CardContent>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
