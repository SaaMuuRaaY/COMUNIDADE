import { redirect } from "next/navigation";
import {
  isKnownChannelSlug,
  LEGACY_CATEGORY_TO_CHANNEL,
  channelHref,
} from "@/lib/community/structure";
import { CommunityGeneralFeed } from "@/components/community/community-feed";

type SearchParams = Promise<{ category?: string; q?: string }>;

export const metadata = { title: "Comunidade" };

// Fase 6.6 — /community é o FEED GERAL agregado (posts de todos os canais).
// NÃO redireciona para canal. Retrocompat: ?category=X → rota raiz do canal (/[canal]),
// preservando ?q=. Categoria desconhecida ou canal legado (sem rota) cai no feed geral.
export default async function CommunityPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;
  const q = sp.q?.trim() ?? "";

  const cat = sp.category?.trim();
  if (cat) {
    const slug = isKnownChannelSlug(cat) ? cat : LEGACY_CATEGORY_TO_CHANNEL[cat];
    const href = slug ? channelHref(slug) : undefined;
    if (href) {
      redirect(q ? `${href}?q=${encodeURIComponent(q)}` : href);
    }
  }

  return <CommunityGeneralFeed search={q} />;
}
