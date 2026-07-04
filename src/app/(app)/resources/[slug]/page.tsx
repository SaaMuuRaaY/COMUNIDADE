import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft, Download, ExternalLink } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { CategoryBadge } from "@/components/resources/category-badge";
import { Markdown } from "@/components/shared/markdown";
import { TrackedLink } from "@/components/resources/tracked-link";
import { requireProfile } from "@/lib/auth/current-user";
import { getResourceBySlug } from "@/server/queries/library";

export const metadata = { title: "Recurso · Biblioteca" };

const BTN =
  "inline-flex items-center gap-2 rounded-md bg-primary px-3.5 py-2 text-sm font-medium text-primary-foreground transition-colors hover:bg-primary/90";

export default async function ResourceDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  await requireProfile();
  const r = await getResourceBySlug(slug);
  if (!r) notFound();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Link
        href="/resources"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Biblioteca
      </Link>

      <Card className="overflow-hidden">
        {r.cover_url ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img src={r.cover_url} alt={r.title} className="aspect-video w-full object-cover" />
        ) : null}
        <CardContent className="space-y-3 p-5 md:p-6">
          <CategoryBadge category={r.category} className="w-fit" />
          <h1 className="text-2xl font-semibold tracking-tight">{r.title}</h1>
          {r.description ? (
            <div className="text-sm">
              <Markdown>{r.description}</Markdown>
            </div>
          ) : null}
          {r.file_url ? (
            <TrackedLink kind="resource" id={r.id} href={r.file_url} className={BTN}>
              <Download className="h-4 w-4" /> Baixar / Acessar <ExternalLink className="h-3.5 w-3.5" />
            </TrackedLink>
          ) : null}
          <p className="text-xs text-muted-foreground">{r.click_count} acesso(s)</p>
        </CardContent>
      </Card>
    </div>
  );
}
