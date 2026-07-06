import { Download, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { CategoryBadge } from "@/components/resources/category-badge";
import { Markdown } from "@/components/shared/markdown";
import { TrackedLink } from "@/components/resources/tracked-link";
import { APP_STATUSES, APP_TYPES } from "@/lib/constants";
import { isSafeEmbedUrl } from "@/lib/storage/upload";
import type { ResourceDetail, AppDetail } from "@/server/queries/library";

/**
 * Conteudo do detalhe de um item da Biblioteca — FONTE UNICA de render, reusada
 * pela pagina /[slug], pelo preview publico e pelo modal interceptado. Uniao
 * discriminada por `kind` para tipagem forte (recurso vs app), sem duplicacao.
 */
export type ResourceItemView = { kind: "resource" } & ResourceDetail;
export type AppItemView = { kind: "app" } & AppDetail;
export type LibraryItem = ResourceItemView | AppItemView;

const BTN =
  "inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";

export function LibraryItemContent({ item }: { item: LibraryItem }) {
  return (
    <Card className="overflow-hidden">
      {item.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={item.cover_url}
          alt={item.kind === "resource" ? item.title : item.name}
          className="aspect-video w-full object-cover"
        />
      ) : null}
      <CardContent className="space-y-3 p-5 md:p-6">
        {item.kind === "resource" ? <ResourceBody item={item} /> : <AppBody item={item} />}
        <p className="text-xs text-muted-foreground">{item.click_count} acesso(s)</p>
      </CardContent>
    </Card>
  );
}

function ResourceBody({ item }: { item: ResourceItemView }) {
  return (
    <>
      <CategoryBadge category={item.category} className="w-fit" />
      <h1 className="text-2xl font-semibold tracking-tight">{item.title}</h1>
      {item.description ? (
        <div className="text-sm">
          <Markdown>{item.description}</Markdown>
        </div>
      ) : null}
      {item.file_url ? (
        <TrackedLink kind="resource" id={item.id} href={item.file_url} className={BTN}>
          <Download className="h-4 w-4" /> Baixar / Acessar <ExternalLink className="h-3.5 w-3.5" />
        </TrackedLink>
      ) : null}
    </>
  );
}

function AppBody({ item }: { item: AppItemView }) {
  const openUrl = item.url || item.file_url;
  return (
    <>
      <div className="flex flex-wrap items-center gap-2">
        <Badge variant="secondary">
          {APP_TYPES.find((t) => t.value === item.type)?.label ?? item.type}
        </Badge>
        <Badge variant="outline">
          {APP_STATUSES.find((s) => s.value === item.status)?.label ?? item.status}
        </Badge>
      </div>
      <h1 className="text-2xl font-semibold tracking-tight">{item.name}</h1>
      {item.description ? <p className="text-sm text-muted-foreground">{item.description}</p> : null}
      {item.type === "embed" && item.embed_url && isSafeEmbedUrl(item.embed_url) ? (
        <iframe
          src={item.embed_url}
          title={item.name}
          className="aspect-video w-full rounded-md border"
          sandbox="allow-scripts allow-forms allow-popups allow-presentation"
          referrerPolicy="strict-origin-when-cross-origin"
          allowFullScreen
        />
      ) : null}
      {openUrl ? (
        <TrackedLink kind="app" id={item.id} href={openUrl} className={BTN}>
          Abrir aplicativo <ExternalLink className="h-3.5 w-3.5" />
        </TrackedLink>
      ) : null}
    </>
  );
}
