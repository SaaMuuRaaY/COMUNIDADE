import { redirect } from "next/navigation";
import {
  DEFAULT_CHANNEL_SLUG,
  isKnownChannelSlug,
  LEGACY_CATEGORY_TO_CHANNEL,
} from "@/lib/community/structure";

type SearchParams = Promise<{ category?: string; q?: string }>;

// Landing da comunidade: redireciona para o canal padrão. Mantém retrocompat com
// URLs antigas `?category=X` (→ canal correspondente) e preserva `?q=`.
export default async function CommunityIndexPage({ searchParams }: { searchParams: SearchParams }) {
  const sp = await searchParams;

  let target = DEFAULT_CHANNEL_SLUG;
  const cat = sp.category?.trim();
  if (cat) {
    if (isKnownChannelSlug(cat)) target = cat;
    else if (LEGACY_CATEGORY_TO_CHANNEL[cat]) target = LEGACY_CATEGORY_TO_CHANNEL[cat];
  }

  const q = sp.q?.trim() ? `?q=${encodeURIComponent(sp.q.trim())}` : "";
  redirect(`/community/c/${target}${q}`);
}
