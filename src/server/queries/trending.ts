import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

export type TrendingPost = {
  id: string;
  title: string;
  category: string;
  author_name: string | null;
  interactions: number;
};

/**
 * "Publicacoes em Alta" — chama a RPC get_trending_posts (hot_score) e enriquece
 * com o nome do autor. Trending e GLOBAL (mesmo p/ todos; posts com is_deleted=false
 * sao visiveis a qualquer membro), entao usamos o client service-role (sem cookies)
 * e cacheamos por 120s via unstable_cache. Fallback: se ninguem bateu o minimo de
 * interacoes, mostra os mais recentes.
 */
const cachedTrending = unstable_cache(
  async (limit: number): Promise<TrendingPost[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase.rpc("get_trending_posts", { p_days: 7, p_limit: limit });

    let base = (data ?? []).map((r) => ({
      id: r.id,
      title: r.title,
      category: r.category,
      author_id: r.author_id,
      interactions: r.likes + r.reactions + r.unique_commenters,
    }));

    if (base.length === 0) {
      const { data: recent } = await supabase
        .from("posts")
        .select("id, title, category, author_id")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit);
      base = (recent ?? []).map((r) => ({
        id: r.id,
        title: r.title ?? "(sem título)",
        category: r.category,
        author_id: r.author_id,
        interactions: 0,
      }));
    }

    if (base.length === 0) return [];

    const authorIds = [...new Set(base.map((b) => b.author_id))];
    const { data: profiles } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    const nameById = new Map((profiles ?? []).map((p) => [p.id, p.full_name]));

    return base.map((b) => ({
      id: b.id,
      title: b.title,
      category: b.category,
      author_name: nameById.get(b.author_id) ?? null,
      interactions: b.interactions,
    }));
  },
  ["trending-posts"],
  { revalidate: 120, tags: ["trending"] },
);

export function getTrendingPosts(limit = 5) {
  return cachedTrending(limit);
}
