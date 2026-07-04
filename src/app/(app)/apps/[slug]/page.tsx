import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { TrackedLink } from "@/components/resources/tracked-link";
import { requireProfile } from "@/lib/auth/current-user";
import { getAppBySlug } from "@/server/queries/library";
import { APP_STATUSES, APP_TYPES } from "@/lib/constants";

export const metadata = { title: "Aplicativo · Biblioteca" };

const BTN =
  "inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";

export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireProfile();
  const a = await getAppBySlug(slug);
  if (!a) notFound();

  const openUrl = a.url || a.file_url;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Link
        href="/apps"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Aplicativos
      </Link>

      <Card className="overflow-hidden">
        {a.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={a.cover_url} alt={a.name} className="aspect-video w-full object-cover" />
        ) : null}
        <CardContent className="space-y-3 p-5 md:p-6">
          <div className="flex flex-wrap items-center gap-2">
            <Badge variant="secondary">{APP_TYPES.find((t) => t.value === a.type)?.label ?? a.type}</Badge>
            <Badge variant="outline">
              {APP_STATUSES.find((s) => s.value === a.status)?.label ?? a.status}
            </Badge>
          </div>
          <h1 className="text-2xl font-semibold tracking-tight">{a.name}</h1>
          {a.description ? <p className="text-sm text-muted-foreground">{a.description}</p> : null}
          {a.type === "embed" && a.embed_url ? (
            <iframe
              src={a.embed_url}
              title={a.name}
              className="aspect-video w-full rounded-md border"
              allowFullScreen
            />
          ) : null}
          {openUrl ? (
            <TrackedLink kind="app" id={a.id} href={openUrl} className={BTN}>
              Abrir aplicativo <ExternalLink className="h-3.5 w-3.5" />
            </TrackedLink>
          ) : null}
          <p className="text-xs text-muted-foreground">{a.click_count} acesso(s)</p>
        </CardContent>
      </Card>
    </div>
  );
}
