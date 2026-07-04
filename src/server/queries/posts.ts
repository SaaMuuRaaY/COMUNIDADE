import "server-only";
import { createClient } from "@/lib/supabase/server";

export type FeedPost = {
  id: string;
  title: string | null;
  body: string;
  category: string;
  media_url: string | null;
  media_type: string | null;
  attachment_url: string | null;
  created_at: string;
  author: {
    id: string;
    full_name: string | null;
    username: string | null;
    avatar_url: string | null;
    level: number;
    role: string;
  } | null;
  likes_count: number;
  comments_count: number;
  liked_by_me: boolean;
  saved_by_me: boolean;
  is_pinned: boolean;
  reactions: Record<string, number>;
  myReactions: string[];
};

const POST_SELECT = `id, title, body, category, media_url, media_type, attachment_url, is_pinned, created_at,
   author:profiles!posts_author_id_fkey(id, full_name, username, avatar_url, level, role)`;

type SupabaseServer = Awaited<ReturnType<typeof createClient>>;

// Enriquece linhas de posts (autor ja embutido) com likes/comentarios/reacoes +
// estado do usuario (curtiu/salvou). Preserva a ORDEM das linhas recebidas.
async function enrichPosts(
  supabase: SupabaseServer,
  posts: Array<Record<string, unknown>>,
  userId: string,
): Promise<FeedPost[]> {
  if (!posts.length) return [];

  const ids = posts.map((p) => p.id as string);
  const [likesRes, commentsRes, myLikesRes, savedRes] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_comments").select("post_id").in("post_id", ids).eq("is_deleted", false),
    supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", userId),
    supabase.from("saved_posts").select("post_id").in("post_id", ids).eq("user_id", userId),
  ]);

  const likes = new Map<string, number>();
  (likesRes.data ?? []).forEach((l) => likes.set(l.post_id as string, (likes.get(l.post_id as string) ?? 0) + 1));
  const comments = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c) =>
    comments.set(c.post_id as string, (comments.get(c.post_id as string) ?? 0) + 1),
  );
  const myLikes = new Set<string>((myLikesRes.data ?? []).map((l) => l.post_id as string));
  const saved = new Set<string>((savedRes.data ?? []).map((s) => s.post_id as string));

  // Reacoes (tolerante: se a tabela post_reactions nao existir, ignora — feed nao quebra).
  const { data: reactionData, error: reactionErr } = await supabase
    .from("post_reactions")
    .select("post_id, emoji, user_id")
    .in("post_id", ids);
  const reactionRows = (reactionErr ? [] : reactionData ?? []) as Array<Record<string, unknown>>;
  const reactionsByPost = new Map<string, Record<string, number>>();
  const myReactionsByPost = new Map<string, string[]>();
  reactionRows.forEach((r) => {
    const pid = r.post_id as string;
    const emoji = r.emoji as string;
    const map = reactionsByPost.get(pid) ?? {};
    map[emoji] = (map[emoji] ?? 0) + 1;
    reactionsByPost.set(pid, map);
    if ((r.user_id as string) === userId) {
      myReactionsByPost.set(pid, [...(myReactionsByPost.get(pid) ?? []), emoji]);
    }
  });

  return posts.map((p) => {
    const authorRaw = p.author as Record<string, unknown> | Record<string, unknown>[] | null;
    const authorRow = Array.isArray(authorRaw) ? authorRaw[0] ?? null : authorRaw;
    return {
      id: p.id as string,
      title: (p.title as string | null) ?? null,
      body: p.body as string,
      category: p.category as string,
      media_url: (p.media_url as string | null) ?? null,
      media_type: (p.media_type as string | null) ?? null,
      attachment_url: (p.attachment_url as string | null) ?? null,
      created_at: p.created_at as string,
      author: authorRow
        ? {
            id: authorRow.id as string,
            full_name: (authorRow.full_name as string | null) ?? null,
            username: (authorRow.username as string | null) ?? null,
            avatar_url: (authorRow.avatar_url as string | null) ?? null,
            level: (authorRow.level as number) ?? 1,
            role: (authorRow.role as string) ?? "member",
          }
        : null,
      likes_count: likes.get(p.id as string) ?? 0,
      comments_count: comments.get(p.id as string) ?? 0,
      liked_by_me: myLikes.has(p.id as string),
      saved_by_me: saved.has(p.id as string),
      is_pinned: (p.is_pinned as boolean) ?? false,
      reactions: reactionsByPost.get(p.id as string) ?? {},
      myReactions: myReactionsByPost.get(p.id as string) ?? [],
    };
  });
}

export async function getFeedPosts(opts: {
  userId: string;
  channel?: string;
  search?: string;
  limit?: number;
}): Promise<FeedPost[]> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("is_deleted", false)
    .order("is_pinned", { ascending: false })
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);

  if (opts.channel) {
    query = query.eq("category", opts.channel);
  }
  if (opts.search && opts.search.trim()) {
    // Sanitiza contra PostgREST filter injection: escapa wildcards do LIKE
    // e remove metacaracteres do parser de filtros (virgula, parenteses, aspas, ':', '*').
    const safe = opts.search
      .trim()
      .slice(0, 100)
      .replace(/[%_\\]/g, "\\$&")
      .replace(/[(),":*]/g, " ")
      .trim();
    if (safe) {
      const term = `%${safe}%`;
      query = query.or(`title.ilike.${term},body.ilike.${term}`);
    }
  }

  const { data: rows } = await query;
  return enrichPosts(supabase, (rows ?? []) as Array<Record<string, unknown>>, opts.userId);
}

// Posts salvos pelo usuario (FEATURE 04 Fase 3), na ordem em que foram salvos.
export async function getSavedPosts(userId: string, limit = 30): Promise<FeedPost[]> {
  const supabase = await createClient();
  const { data: saved } = await supabase
    .from("saved_posts")
    .select("post_id, created_at")
    .eq("user_id", userId)
    .order("created_at", { ascending: false })
    .limit(limit);

  const ids = (saved ?? []).map((s) => s.post_id as string);
  if (!ids.length) return [];

  const { data: rows } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .in("id", ids)
    .eq("is_deleted", false);

  const enriched = await enrichPosts(supabase, (rows ?? []) as Array<Record<string, unknown>>, userId);
  const order = new Map(ids.map((id, i) => [id, i]));
  return enriched.sort((a, b) => (order.get(a.id) ?? 0) - (order.get(b.id) ?? 0));
}

export async function getPostById(id: string, userId: string): Promise<FeedPost | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("posts")
    .select(POST_SELECT)
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!row) return null;
  const [enriched] = await enrichPosts(supabase, [row as Record<string, unknown>], userId);
  return enriched ?? null;
}

export type CommentRow = {
  id: string;
  body: string;
  created_at: string;
  parent_id: string | null;
  author: { id: string; full_name: string | null; avatar_url: string | null; level: number } | null;
};

export async function getCommentsByPost(postId: string): Promise<CommentRow[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("post_comments")
    .select("id, body, created_at, parent_id, author:profiles!post_comments_author_id_fkey(id, full_name, avatar_url, level)")
    .eq("post_id", postId)
    .eq("is_deleted", false)
    .order("created_at");
  return (data ?? []).map((c) => {
    const row = c as Record<string, unknown>;
    const authorRaw = row.author as Record<string, unknown> | Record<string, unknown>[] | null;
    const authorRow = Array.isArray(authorRaw) ? authorRaw[0] ?? null : authorRaw;
    return {
      id: row.id as string,
      body: row.body as string,
      created_at: row.created_at as string,
      parent_id: (row.parent_id as string | null) ?? null,
      author: authorRow
        ? {
            id: authorRow.id as string,
            full_name: (authorRow.full_name as string | null) ?? null,
            avatar_url: (authorRow.avatar_url as string | null) ?? null,
            level: (authorRow.level as number) ?? 1,
          }
        : null,
    };
  });
}
