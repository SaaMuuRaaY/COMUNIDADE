import { notFound, redirect } from "next/navigation";
import { getChannel, channelHref } from "@/lib/community/structure";

type Params = Promise<{ channel: string }>;
type SearchParams = Promise<{ q?: string }>;

// Fase 6.6 — rota LEGADA. /community/c/[channel] → rota raiz do canal (/[canal]).
// Canal legado (sem rota raiz) → Feed Geral. Slug desconhecido → 404.
export default async function LegacyChannelRedirect({
  params,
  searchParams,
}: {
  params: Params;
  searchParams: SearchParams;
}) {
  const { channel } = await params;
  if (!getChannel(channel)) notFound();
  const sp = await searchParams;
  const q = sp.q?.trim();
  const href = channelHref(channel) ?? "/community";
  redirect(q ? `${href}?q=${encodeURIComponent(q)}` : href);
}
