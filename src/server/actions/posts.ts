"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";
import { isModerator } from "@/lib/permissions/policies";
import { awardPoints } from "@/lib/points/award";
import { postSchema, commentSchema } from "@/lib/validations/schemas";
import { COMMUNITY_ID, POINTS, REACTION_EMOJIS } from "@/lib/constants";
import { rateLimit } from "@/lib/security/rate-limit";

const RATE_MSG = "Muitas ações em pouco tempo. Aguarde um momento.";

export type ActionResult = { ok: boolean; error?: string; id?: string };

export async function createPostAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!rateLimit(`post:${profile.id}`, { limit: 12, windowMs: 60_000 }).ok) return { ok: false, error: RATE_MSG };

  const parsed = postSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title") || null,
    body: formData.get("body"),
    media_url: formData.get("media_url") || null,
    media_type: formData.get("media_type") || null,
    attachment_url: formData.get("attachment_url") || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("posts")
    .insert({
      community_id: COMMUNITY_ID,
      author_id: profile.id,
      ...parsed.data,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };

  await awardPoints(profile.id, "post_created", POINTS.POST_CREATED, "post", data.id);
  revalidatePath("/community");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id };
}

export async function updatePostAction(postId: string, formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const parsed = postSchema.partial().safeParse({
    category: formData.get("category"),
    title: formData.get("title"),
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Publicação não encontrada." };
  if (existing.author_id !== profile.id && !isModerator(profile)) {
    return { ok: false, error: "Sem permissão." };
  }

  const { error } = await supabase.from("posts").update(parsed.data).eq("id", postId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return { ok: true, id: postId };
}

export async function deletePostAction(postId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("posts")
    .select("author_id")
    .eq("id", postId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Publicação não encontrada." };
  if (existing.author_id !== profile.id && !isModerator(profile)) {
    return { ok: false, error: "Sem permissão." };
  }

  const { error } = await supabase.from("posts").update({ is_deleted: true }).eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  return { ok: true };
}

// Fixar post (Fase 4) — somente moderador/admin. is_pinned já existe no schema (0002).
export async function pinPostAction(postId: string, pinned: boolean): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isModerator(profile)) return { ok: false, error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ is_pinned: pinned }).eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return { ok: true };
}

export async function togglePostLikeAction(postId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!rateLimit(`like:${profile.id}`, { limit: 60, windowMs: 60_000 }).ok) return { ok: false, error: RATE_MSG };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("post_likes").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: profile.id });
    if (error) return { ok: false, error: error.message };
    // pontos para o autor são lançados pelo trigger handle_like_award
  }

  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return { ok: true };
}

// Reações por emoji (Fase 4 / 4B-2) — aditivo, NÃO dá pontos (like é o driver).
export async function togglePostReactionAction(postId: string, emoji: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return { ok: false, error: "Reação inválida." };
  }
  if (!rateLimit(`react:${profile.id}`, { limit: 60, windowMs: 60_000 }).ok) {
    return { ok: false, error: RATE_MSG };
  }

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("post_reactions")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .eq("emoji", emoji)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("post_reactions").delete().eq("id", existing.id);
    if (error) return { ok: false, error: error.message };
  } else {
    const { error } = await supabase
      .from("post_reactions")
      .insert({ post_id: postId, user_id: profile.id, emoji });
    if (error) return { ok: false, error: error.message };
  }

  revalidatePath("/community");
  revalidatePath(`/community/${postId}`);
  return { ok: true };
}

export async function createCommentAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!rateLimit(`comment:${profile.id}`, { limit: 20, windowMs: 60_000 }).ok) return { ok: false, error: RATE_MSG };

  const parsed = commentSchema.safeParse({
    post_id: formData.get("post_id"),
    parent_id: formData.get("parent_id") || null,
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id")
    .eq("id", parsed.data.post_id)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!post) return { ok: false, error: "Publicação não encontrada." };

  const { data, error } = await supabase
    .from("post_comments")
    .insert({
      post_id: parsed.data.post_id,
      author_id: profile.id,
      parent_id: parsed.data.parent_id ?? null,
      body: parsed.data.body,
    })
    .select("id")
    .single();

  if (error) return { ok: false, error: error.message };
  await awardPoints(profile.id, "comment_created", POINTS.COMMENT_CREATED, "comment", data.id);
  revalidatePath(`/community/${parsed.data.post_id}`);
  revalidatePath("/community");
  return { ok: true, id: data.id };
}

export async function deleteCommentAction(commentId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("post_comments")
    .select("author_id, post_id")
    .eq("id", commentId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Comentário não encontrado." };
  if (existing.author_id !== profile.id && !isModerator(profile)) {
    return { ok: false, error: "Sem permissão." };
  }
  const { error } = await supabase.from("post_comments").update({ is_deleted: true }).eq("id", commentId);
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/community/${existing.post_id}`);
  return { ok: true };
}
