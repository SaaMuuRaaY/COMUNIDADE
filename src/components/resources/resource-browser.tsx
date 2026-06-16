"use client";

import * as React from "react";
import { Library, Eye, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Markdown } from "@/components/shared/markdown";
import { EmptyState } from "@/components/shared/empty-state";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import { cn } from "@/lib/utils";

export type ResourceItem = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
};

function catLabel(value: string): string {
  return RESOURCE_CATEGORIES.find((c) => c.value === value)?.label ?? value;
}

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
            <Card key={r.id} className="flex h-full flex-col">
              <CardContent className="flex flex-1 flex-col space-y-3 p-5">
                <div className="flex items-center gap-2">
                  <Library className="h-4 w-4 text-muted-foreground" />
                  <Badge variant="secondary">{catLabel(r.category)}</Badge>
                </div>
                <h3 className="font-semibold leading-tight">{r.title}</h3>
                {r.description ? (
                  <p className="line-clamp-3 flex-1 text-sm text-muted-foreground">{r.description}</p>
                ) : (
                  <div className="flex-1" />
                )}
                {r.file_url ? (
                  <Button asChild size="sm" variant="outline" className="gap-2 self-start">
                    <a href={r.file_url} target="_blank" rel="noopener noreferrer">
                      <Eye className="h-3 w-3" /> Ver <ExternalLink className="h-3 w-3" />
                    </a>
                  </Button>
                ) : (
                  <Button
                    size="sm"
                    variant="outline"
                    className="gap-2 self-start"
                    onClick={() => setView(r)}
                  >
                    <Eye className="h-3 w-3" /> Ver
                  </Button>
                )}
              </CardContent>
            </Card>
          ))}
        </div>
      )}

      <Dialog open={!!view} onOpenChange={(o) => !o && setView(null)}>
        <DialogContent className="max-h-[85vh] max-w-2xl overflow-y-auto">
          <DialogHeader>
            {view ? (
              <Badge variant="secondary" className="w-fit text-[10px]">
                {catLabel(view.category)}
              </Badge>
            ) : null}
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
        </DialogContent>
      </Dialog>
    </div>
  );
}
