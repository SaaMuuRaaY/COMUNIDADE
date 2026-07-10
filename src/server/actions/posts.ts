"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";
import { isModerator } from "@/lib/permissions/policies";
import { awardPoints } from "@/lib/points/award";
import { postSchema, createPostSchema, commentSchema } from "@/lib/validations/schemas";
import { COMMUNITY_ID, POINTS, REACTION_EMOJIS } from "@/lib/constants";
import { canPostInChannel, canCommentInChannel } from "@/lib/community/structure";
import { rateLimit } from "@/lib/security/rate-limit";
import { reportActionError } from "@/lib/observability";

const RATE_MSG = "Muitas ações em pouco tempo. Aguarde um momento.";

export type ActionResult = {
  ok: boolean;
  error?: string;
  id?: string;
  /** true SÓ na transição real pendente→concluída da 1ª apresentação (dispara os confetes). */
  isFirstIntro?: boolean;
};

export async function createPostAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!(await rateLimit(`post:${profile.id}`, { limit: 12, windowMs: 60_000 })).ok) return { ok: false, error: RATE_MSG };

  const parsed = createPostSchema.safeParse({
    category: formData.get("category"),
    title: formData.get("title") || null,
    body: formData.get("body"),
    media_url: formData.get("media_url") || null,
    media_type: formData.get("media_type") || null,
    attachment_url: formData.get("attachment_url") || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const category = parsed.data.category;
  if (!canPostInChannel(profile, category)) {
    return { ok: false, error: "Sem permissão para publicar neste canal." };
  }

  const supabase = await createClient();

  // Máquina de estados da jornada (espelha o RLS onboarding_allows_post da 0038).
  const { data: mo } = await supabase
    .from("member_onboarding")
    .select("completed_at, grandfathered_at, introduction_completed_at")
    .eq("user_id", profile.id)
    .maybeSingle();
  const unlocked = !!(mo?.grandfathered_at || mo?.introduction_completed_at);
  if (!unlocked) {
    if (!mo?.completed_at) return { ok: false, error: "Conclua o onboarding para publicar." };
    if (category !== "apresente-se") {
      return { ok: false, error: "Faça sua apresentação em Apresente-se para publicar nos demais canais." };
    }
  }

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

  // 1ª apresentação (regra crítica NO MESMO fluxo do insert — não depende de callback
  // do cliente). Idempotente: `.is(introduction_completed_at, null)` + reward por userId.
  const isFirstIntro =
    category === "apresente-se" && !mo?.grandfathered_at && !mo?.introduction_completed_at;
  if (isFirstIntro) {
    await supabase
      .from("member_onboarding")
      .update({ introduction_post_id: data.id, introduction_completed_at: new Date().toISOString() })
      .eq("user_id", profile.id)
      .is("introduction_completed_at", null);
    await awardPoints(profile.id, "first_introduction", POINTS.FIRST_INTRODUCTION, "introduction", profile.id);
    // A jornada NÃO se auto-conclui aqui: quem carimba journey_completed_at é o
    // fim do tour (completeJourneyAction). Ver F9.4.
    revalidatePath("/comece-por-aqui");
  }

  revalidatePath("/community", "layout");
  revalidatePath("/dashboard");
  return { ok: true, id: data.id, isFirstIntro };
}

export async function updatePostAction(postId: string, formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  const parsed = postSchema.partial().safeParse({
    // Membro comum edita sem mexer no canal: a chave não vem no FormData e
    // `formData.get` devolve null, que o schema (category optional, não nullable)
    // rejeitaria. `?? undefined` = "não alterar a categoria".
    category: formData.get("category") ?? undefined,
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
  if (parsed.data.category && !canPostInChannel(profile, parsed.data.category)) {
    return { ok: false, error: "Sem permissão para mover para este canal." };
  }

  const { error } = await supabase.from("posts").update(parsed.data).eq("id", postId);
  if (error) return { ok: false, error: error.message };

  revalidatePath("/community", "layout");
  revalidatePath(`/post/${postId}`);
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
  revalidatePath("/community", "layout");
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

// Excluir permanentemente (hard delete) — somente moderador/admin, e apenas posts já excluídos (soft-delete).
export async function purgePostAction(postId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isModerator(profile)) return { ok: false, error: "Sem permissão." };
  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("posts")
    .select("is_deleted")
    .eq("id", postId)
    .maybeSingle();

  if (!existing) return { ok: false, error: "Publicação não encontrada." };
  if (!existing.is_deleted) {
    return { ok: false, error: "Só é possível remover permanentemente posts já excluídos." };
  }

  const { error, count } = await supabase
    .from("posts")
    .delete({ count: "exact" })
    .eq("id", postId);
  if (error) return { ok: false, error: error.message };
  if (!count) return { ok: false, error: "Nada foi removido (sem permissão?)." };
  revalidatePath("/admin/posts");
  revalidatePath("/community", "layout");
  return { ok: true };
}

// Fixar post (Fase 4) — somente moderador/admin. is_pinned já existe no schema (0002).
export async function pinPostAction(postId: string, pinned: boolean): Promise<ActionResult> {
  const profile = await requireProfile();
  if (!isModerator(profile)) return { ok: false, error: "Sem permissão." };
  const supabase = await createClient();
  const { error } = await supabase.from("posts").update({ is_pinned: pinned }).eq("id", postId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/community", "layout");
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

export async function togglePostLikeAction(postId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!(await rateLimit(`like:${profile.id}`, { limit: 60, windowMs: 60_000 })).ok) return { ok: false, error: RATE_MSG };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("post_likes")
    .select("id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase.from("post_likes").delete().eq("id", existing.id);
    if (error) {
      reportActionError("[posts] descurtir", error);
      return { ok: false, error: "Não foi possível atualizar a curtida. Tente novamente." };
    }
  } else {
    const { error } = await supabase.from("post_likes").insert({ post_id: postId, user_id: profile.id });
    if (error) {
      reportActionError("[posts] curtir", error);
      return { ok: false, error: "Não foi possível atualizar a curtida. Tente novamente." };
    }
    // pontos para o autor são lançados pelo trigger handle_like_award
  }

  revalidatePath("/community", "layout");
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

// Reações por emoji (Fase 4 / 4B-2) — aditivo, NÃO dá pontos (like é o driver).
export async function togglePostReactionAction(postId: string, emoji: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!(REACTION_EMOJIS as readonly string[]).includes(emoji)) {
    return { ok: false, error: "Reação inválida." };
  }
  if (!(await rateLimit(`react:${profile.id}`, { limit: 60, windowMs: 60_000 })).ok) {
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
    if (error) {
      reportActionError("[posts] remover reação", error);
      return { ok: false, error: "Não foi possível atualizar a reação. Tente novamente." };
    }
  } else {
    const { error } = await supabase
      .from("post_reactions")
      .insert({ post_id: postId, user_id: profile.id, emoji });
    if (error) {
      reportActionError("[posts] reagir", error);
      return { ok: false, error: "Não foi possível atualizar a reação. Tente novamente." };
    }
  }

  revalidatePath("/community", "layout");
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

// Salvar/dessalvar post (bookmark privado) — FEATURE 04 Fase 3. Sem pontos.
export async function toggleSavePostAction(postId: string): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!(await rateLimit(`save:${profile.id}`, { limit: 60, windowMs: 60_000 })).ok) return { ok: false, error: RATE_MSG };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("saved_posts")
    .select("post_id")
    .eq("post_id", postId)
    .eq("user_id", profile.id)
    .maybeSingle();

  if (existing) {
    const { error } = await supabase
      .from("saved_posts")
      .delete()
      .eq("post_id", postId)
      .eq("user_id", profile.id);
    if (error) {
      reportActionError("[posts] dessalvar", error);
      return { ok: false, error: "Não foi possível atualizar. Tente novamente." };
    }
  } else {
    const { error } = await supabase.from("saved_posts").insert({ post_id: postId, user_id: profile.id });
    if (error) {
      reportActionError("[posts] salvar", error);
      return { ok: false, error: "Não foi possível atualizar. Tente novamente." };
    }
  }

  revalidatePath("/salvos");
  revalidatePath("/community", "layout");
  revalidatePath(`/post/${postId}`);
  return { ok: true };
}

export async function createCommentAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!(await rateLimit(`comment:${profile.id}`, { limit: 20, windowMs: 60_000 })).ok) return { ok: false, error: RATE_MSG };

  const parsed = commentSchema.safeParse({
    post_id: formData.get("post_id"),
    parent_id: formData.get("parent_id") || null,
    body: formData.get("body"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data: post } = await supabase
    .from("posts")
    .select("id, category")
    .eq("id", parsed.data.post_id)
    .eq("is_deleted", false)
    .maybeSingle();
  if (!post) return { ok: false, error: "Publicação não encontrada." };
  if (!isModerator(profile) && !canCommentInChannel(post.category as string)) {
    return { ok: false, error: "Comentários desativados neste canal." };
  }

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
  revalidatePath(`/post/${parsed.data.post_id}`);
  revalidatePath("/community", "layout");
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
  revalidatePath(`/post/${existing.post_id}`);
  return { ok: true };
}
