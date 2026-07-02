import { notFound, redirect } from "next/navigation";
import { getChannel, channelHref } from "@/lib/community/structure";

type Params = Promise<{ postId: string }>;

const UUID_RE = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

// Fase 6.6 — rota LEGADA de detalhe (/community/[postId]). Distingue com segurança:
//  - slug de canal conhecido → rota raiz do canal (cobre /community/[channel] antigo);
//  - UUID de post           → /post/[postId] (rota canônica nova);
//  - qualquer outra coisa   → 404 (não interpreta lixo como ID).
export default async function LegacyPostRedirect({ params }: { params: Params }) {
  const { postId } = await params;

  if (getChannel(postId)) {
    redirect(channelHref(postId) ?? "/community");
  }
  if (UUID_RE.test(postId)) {
    redirect(`/post/${postId}`);
  }
  notFound();
}
