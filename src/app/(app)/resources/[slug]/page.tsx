import { notFound } from "next/navigation";
import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { LibraryItemContent } from "@/components/library/library-item-content";
import { requireProfile } from "@/lib/auth/current-user";
import { getResourceBySlug } from "@/server/queries/library";

export const metadata = { title: "Recurso · Biblioteca" };

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
      <LibraryItemContent item={{ kind: "resource", ...r }} />
    </div>
  );
}
