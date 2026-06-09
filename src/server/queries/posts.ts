import "server-only";
import { createClient } from "@/lib/supabase/server";
import type { PostCategory } from "@/types/db";

export type FeedPost = {
  id: string;
  title: string | null;
  body: string;
  category: PostCategory;
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
};

export async function getFeedPosts(opts: {
  userId: string;
  category?: PostCategory | "all";
  search?: string;
  limit?: number;
}): Promise<FeedPost[]> {
  const supabase = await createClient();
  let query = supabase
    .from("posts")
    .select(
      `id, title, body, category, media_url, media_type, attachment_url, created_at,
       author:profiles!posts_author_id_fkey(id, full_name, username, avatar_url, level, role)`,
    )
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(opts.limit ?? 30);

  if (opts.category && opts.category !== "all") {
    query = query.eq("category", opts.category);
  }
  if (opts.search && opts.search.trim()) {
    // Sanitiza contra PostgREST filter injection: escapa wildcards do LIKE
    // e remove metacaracteres do parser de filtros (vírgula, parênteses, aspas, ':', '*').
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
  const posts = (rows ?? []) as Array<Record<string, unknown>>;
  if (!posts.length) return [];

  const ids = posts.map((p) => p.id as string);
  const [likesRes, commentsRes, myLikesRes] = await Promise.all([
    supabase.from("post_likes").select("post_id").in("post_id", ids),
    supabase.from("post_comments").select("post_id").in("post_id", ids).eq("is_deleted", false),
    supabase.from("post_likes").select("post_id").in("post_id", ids).eq("user_id", opts.userId),
  ]);

  const likes = new Map<string, number>();
  (likesRes.data ?? []).forEach((l) => likes.set(l.post_id as string, (likes.get(l.post_id as string) ?? 0) + 1));
  const comments = new Map<string, number>();
  (commentsRes.data ?? []).forEach((c) =>
    comments.set(c.post_id as string, (comments.get(c.post_id as string) ?? 0) + 1),
  );
  const myLikes = new Set<string>((myLikesRes.data ?? []).map((l) => l.post_id as string));

  return posts.map((p) => {
    const authorRaw = p.author as Record<string, unknown> | Record<string, unknown>[] | null;
    const authorRow = Array.isArray(authorRaw) ? authorRaw[0] ?? null : authorRaw;
    return {
      id: p.id as string,
      title: (p.title as string | null) ?? null,
      body: p.body as string,
      category: p.category as PostCategory,
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
    };
  });
}

export async function getPostById(id: string, userId: string): Promise<FeedPost | null> {
  const supabase = await createClient();
  const { data: row } = await supabase
    .from("posts")
    .select(
      `id, title, body, category, media_url, media_type, attachment_url, created_at,
       author:profiles!posts_author_id_fkey(id, full_name, username, avatar_url, level, role)`,
    )
    .eq("id", id)
    .eq("is_deleted", false)
    .maybeSingle();

  if (!row) return null;
  const p = row as Record<string, unknown>;

  const [{ count: likes }, { count: comments }, { data: myLike }] = await Promise.all([
    supabase.from("post_likes").select("id", { count: "exact", head: true }).eq("post_id", id),
    supabase
      .from("post_comments")
      .select("id", { count: "exact", head: true })
      .eq("post_id", id)
      .eq("is_deleted", false),
    supabase.from("post_likes").select("id").eq("post_id", id).eq("user_id", userId).maybeSingle(),
  ]);

  const authorRaw = p.author as Record<string, unknown> | Record<string, unknown>[] | null;
  const authorRow = Array.isArray(authorRaw) ? authorRaw[0] ?? null : authorRaw;

  return {
    id: p.id as string,
    title: (p.title as string | null) ?? null,
    body: p.body as string,
    category: p.category as PostCategory,
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
    likes_count: likes ?? 0,
    comments_count: comments ?? 0,
    liked_by_me: !!myLike,
  };
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
