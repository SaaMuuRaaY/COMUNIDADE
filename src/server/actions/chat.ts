"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";
import { isModerator } from "@/lib/permissions/policies";
import { messageSchema } from "@/lib/validations/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { hasProfanity, PROFANITY_ERROR } from "@/lib/security/profanity";

const RATE_MSG = "Muitas mensagens em pouco tempo. Aguarde um momento.";
const ROOM = "community";

export type ActionResult = { ok: boolean; error?: string; id?: string };

// Enviar mensagem no chat da comunidade. Realtime propaga o INSERT aos clientes
// (sem revalidatePath — a UI é dirigida pela subscription).
export async function sendMessageAction(formData: FormData): Promise<ActionResult> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!(await rateLimit(`chat:${profile.id}`, { limit: 30, windowMs: 60_000 })).ok) {
    return { ok: false, error: RATE_MSG };
  }

  const parsed = messageSchema.safeParse({ body: formData.get("body") });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensagem inválida" };
  }
  if (hasProfanity(parsed.data.body)) return { ok: false, error: PROFANITY_ERROR };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("chat_messages")
    .insert({
      room: ROOM,
      author_id: profile.id,
      author_name: profile.full_name,
      author_avatar: profile.avatar_url,
      body: parsed.data.body,
    })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  return { ok: true, id: data.id };
}

// Remover mensagem (soft-delete). Autor ou moderador. Realtime propaga o UPDATE.
export async function deleteMessageAction(messageId: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(messageId).success) {
    return { ok: false, error: "ID inválido." };
  }
  const profile = await requireProfile();
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from("chat_messages")
    .select("author_id")
    .eq("id", messageId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Mensagem não encontrada." };
  if (existing.author_id !== profile.id && !isModerator(profile)) {
    return { ok: false, error: "Sem permissão." };
  }

  const { error } = await supabase
    .from("chat_messages")
    .update({ is_deleted: true })
    .eq("id", messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Editar a propria mensagem (corpo). Apenas o AUTOR (moderador so remove).
// Realtime propaga o UPDATE (corpo + edited_at).
export async function editMessageAction(messageId: string, body: string): Promise<ActionResult> {
  if (!z.string().uuid().safeParse(messageId).success) {
    return { ok: false, error: "ID inválido." };
  }
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };

  const parsed = messageSchema.safeParse({ body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensagem inválida" };
  }
  if (hasProfanity(parsed.data.body)) return { ok: false, error: PROFANITY_ERROR };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("chat_messages")
    .select("author_id, is_deleted")
    .eq("id", messageId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Mensagem não encontrada." };
  if (existing.author_id !== profile.id) return { ok: false, error: "Sem permissão." };
  if (existing.is_deleted) return { ok: false, error: "Mensagem removida." };

  const { error } = await supabase
    .from("chat_messages")
    .update({ body: parsed.data.body, edited_at: new Date().toISOString() })
    .eq("id", messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}
