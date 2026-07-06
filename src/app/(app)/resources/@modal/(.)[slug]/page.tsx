import { notFound } from "next/navigation";
import { ItemModal } from "@/components/library/item-modal";
import { LibraryItemContent } from "@/components/library/library-item-content";
import { getResourceBySlug } from "@/server/queries/library";

// Modal interceptado: clicar num recurso no grid abre o pop-up com a URL propria
// /resources/[slug] (compartilhavel). Em (app) -> usuario logado -> conteudo completo.
export default async function ResourceModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const r = await getResourceBySlug(slug);
  if (!r) notFound();

  return (
    <ItemModal title={r.title}>
      <LibraryItemContent item={{ kind: "resource", ...r }} />
    </ItemModal>
  );
}
