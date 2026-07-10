import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { reportActionError } from "@/lib/observability";

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
    // Os throws ficam DENTRO da fn cacheada: unstable_cache só memoriza resoluções,
    // então uma falha nunca é servida como lista vazia pelos 120s seguintes. Quem
    // chama captura e degrada para [] — a página não cai.
    const { data, error } = await supabase.rpc("get_trending_posts", { p_days: 7, p_limit: limit });
    if (error) throw error;

    let base = (data ?? []).map((r) => ({
      id: r.id,
      // O tipo gerado diz string, mas posts.title e nullable no banco.
      title: (r.title as string | null) ?? "(sem título)",
      category: r.category,
      author_id: r.author_id,
      interactions: r.likes + r.reactions + r.unique_commenters,
    }));

    if (base.length === 0) {
      const { data: recent, error: recentError } = await supabase
        .from("posts")
        .select("id, title, category, author_id")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(limit);
      if (recentError) throw recentError;
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
    const { data: profiles, error: profilesError } = await supabase
      .from("profiles")
      .select("id, full_name")
      .in("id", authorIds);
    if (profilesError) throw profilesError;
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

export async function getTrendingPosts(limit = 5): Promise<TrendingPost[]> {
  try {
    return await cachedTrending(limit);
  } catch (error) {
    reportActionError("trending.getTrendingPosts", error);
    return [];
  }
}
