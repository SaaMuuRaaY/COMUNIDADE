import type { Metadata } from "next";
import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LibraryItemContent } from "@/components/library/library-item-content";
import { PublicItemPreview } from "@/components/library/public-item-preview";
import { getCurrentUser } from "@/lib/auth/current-user";
import { getAppBySlug, getPublicPreview } from "@/server/queries/library";

export async function generateMetadata({
  params,
}: {
  params: Promise<{ slug: string }>;
}): Promise<Metadata> {
  const { slug } = await params;
  const preview = await getPublicPreview("app", slug);
  if (!preview) return { title: "Aplicativo · Biblioteca" };
  return {
    title: `${preview.title} · Biblioteca`,
    description: preview.teaser ?? undefined,
    openGraph: {
      title: preview.title,
      description: preview.teaser ?? undefined,
      images: preview.cover_url ? [preview.cover_url] : undefined,
    },
  };
}

export default async function AppDetailPage({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const user = await getCurrentUser();

  if (user) {
    const a = await getAppBySlug(slug);
    if (!a) notFound();
    return (
      <div className="space-y-4">
        <Link
          href="/apps"
          className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
        >
          <ArrowLeft className="h-4 w-4" /> Aplicativos
        </Link>
        <LibraryItemContent item={{ kind: "app", ...a }} />
      </div>
    );
  }

  const preview = await getPublicPreview("app", slug);
  if (!preview) notFound();
  return <PublicItemPreview preview={preview} next={`/apps/${slug}`} />;
}
