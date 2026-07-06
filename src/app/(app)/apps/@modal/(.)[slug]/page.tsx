import { notFound } from "next/navigation";
import { ItemModal } from "@/components/library/item-modal";
import { LibraryItemContent } from "@/components/library/library-item-content";
import { getAppBySlug } from "@/server/queries/library";

// Modal interceptado: clicar num app no grid abre o pop-up com a URL propria
// /apps/[slug] (compartilhavel). Em (app) -> usuario logado -> conteudo completo.
export default async function AppModal({ params }: { params: Promise<{ slug: string }> }) {
  const { slug } = await params;
  const a = await getAppBySlug(slug);
  if (!a) notFound();

  return (
    <ItemModal title={a.name}>
      <LibraryItemContent item={{ kind: "app", ...a }} />
    </ItemModal>
  );
}
