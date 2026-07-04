"use client";

import * as React from "react";
import Link from "next/link";
import { Library, Eye, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge } from "@/components/resources/category-badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/shared/markdown";
import { TrackedLink } from "@/components/resources/tracked-link";
import { incrementResourceClick } from "@/server/actions/resources-apps-events";
import { EmptyState } from "@/components/shared/empty-state";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ResourceItem = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  cover_url: string | null;
  click_count: number;
};

function FilterPill({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "rounded-full border px-3 py-1 text-xs transition-colors",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      {children}
    </button>
  );
}

export function ResourceBrowser({ resources }: { resources: ResourceItem[] }) {
  const [active, setActive] = React.useState<string>("all");
  const [view, setView] = React.useState<ResourceItem | null>(null);

  const present = RESOURCE_CATEGORIES.filter((c) => resources.some((r) => r.category === c.value));
  const filtered = active === "all" ? resources : resources.filter((r) => r.category === active);

  return (
    <div className="space-y-4">
      {present.length > 1 ? (
        <div className="flex flex-wrap gap-2">
          <FilterPill active={active === "all"} onClick={() => setActive("all")}>
            Todas
          </FilterPill>
          {present.map((c) => (
            <FilterPill key={c.value} active={active === c.value} onClick={() => setActive(c.value)}>
              {c.label}
            </FilterPill>
          ))}
        </div>
      ) : null}

      {filtered.length === 0 ? (
        <EmptyState icon={Library} title="Nenhum recurso nesta categoria" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {filtered.map((r) => (
            <Card key={r.id} className="flex h-full flex-col overflow-hidden">
              {r.cover_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={r.cover_url} alt={r.title} className="aspect-video w-full object-cover" />
              ) : null}
              <CardContent className="flex flex-1 flex-col space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-muted-foreground" />
                  <CategoryBadge category={r.category} />
                </div>
                <h3 className="font-semibold leading-tight">
                  <Link
                    href={`/resources/${r.slug ?? r.id}`}
                    className="hover:text-[var(--accent)] hover:underline"
                  >
                    {r.title}
                  </Link>
                </h3>
                {r.description ? (
                  <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{r.description}</p>
                ) : (
                  <div className="flex-1" />
                )}
                <div className="mt-auto flex items-center justify-between gap-2 pt-1">
                  {r.file_url ? (
                    <TrackedLink
                      kind="resource"
                      id={r.id}
                      href={r.file_url}
                      className="inline-flex items-center gap-2 rounded-md border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
                    >
                      <Eye className="h-3 w-3" /> Ver <ExternalLink className="h-3 w-3" />
                    </TrackedLink>
                  ) : (
                    <Button
                      size="sm"
                      variant="outline"
                      className="gap-2"
                      onClick={() => {
                        setView(r);
                        void incrementResourceClick(r.id);
                      }}
                    >
                      <Eye className="h-3 w-3" /> Ver
                    </Button>
                  )}
                  <span className="shrink-0 text-xs text-muted-foreground">
                    {r.click_count} acesso{r.click_count === 1 ? "" : "s"}
                  </span>
                </div>
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            {view ? <CategoryBadge category={view.category} className="w-fit" /> : null}
            <DialogTitle>{view?.title}</DialogTitle>
            <DialogDescription className="sr-only">Conteúdo do recurso</DialogDescription>
          </DialogHeader>
          {view?.description ? (
            <div className="text-sm">
              <Markdown>{view.description}</Markdown>
            </div>
          ) : (
            <p className="text-sm text-muted-foreground">Sem conteúdo.</p>
          )}
          {view?.file_url ? (
            <Button asChild variant="outline" size="sm" className="mt-2 gap-2 self-start">
              <a href={view.file_url} target="_blank" rel="noopener noreferrer">
                Abrir arquivo <ExternalLink className="h-3 w-3" />
              </a>
            </Button>
          ) : null}
          {view ? (
            <p className="text-xs text-muted-foreground">{view.click_count} acesso(s)</p>
          ) : null}
        </DialogContent>
      </Dialog>
    </div>
  );
}
