"use server";

import { z } from "zod";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile } from "@/lib/auth/current-user";
import { messageSchema, reportSchema } from "@/lib/validations/schemas";
import { rateLimit } from "@/lib/security/rate-limit";
import { hasProfanity, PROFANITY_ERROR } from "@/lib/security/profanity";
import {
  listMembersForDM,
  getConversations,
  type DMMemberOption,
  type DMConversationSummary,
} from "@/server/queries/direct-messages";

export type DMResult = { ok: boolean; error?: string; id?: string };
export type StartResult = { ok: boolean; error?: string; conversationId?: string };

const RATE_MSG = "Muitas mensagens em pouco tempo. Aguarde um momento.";
const uuid = (v: string) => z.string().uuid().safeParse(v).success;
const nowIso = () => new Date().toISOString();

// Abre (ou reusa) a conversa 1:1 com `otherUserId`. Ordem canonica user_a<user_b.
export async function startConversation(otherUserId: string): Promise<StartResult> {
  if (!uuid(otherUserId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireActiveProfile();
  if (otherUserId === me.id) return { ok: false, error: "Não é possível conversar consigo mesmo." };

  const supabase = await createClient();

  const { data: other } = await supabase
    .from("profiles")
    .select("id, is_banned")
    .eq("id", otherUserId)
    .maybeSingle();
  if (!other || other.is_banned) return { ok: false, error: "Usuário indisponível." };

  const { data: blocked } = await supabase.rpc("is_dm_blocked", { other: otherUserId });
  if (blocked) return { ok: false, error: "Vocês não podem trocar mensagens." };

  const [user_a, user_b] = me.id < otherUserId ? [me.id, otherUserId] : [otherUserId, me.id];

  const { data: existing } = await supabase
    .from("dm_conversations")
    .select("id")
    .eq("user_a", user_a)
    .eq("user_b", user_b)
    .maybeSingle();
  if (existing) return { ok: true, conversationId: existing.id };

  const ins = await supabase
    .from("dm_conversations")
    .insert({ user_a, user_b })
    .select("id")
    .single();
  if (ins.error) {
    // corrida: outra requisição criou a conversa — reconsulta.
    const retry = await supabase
      .from("dm_conversations")
      .select("id")
      .eq("user_a", user_a)
      .eq("user_b", user_b)
      .maybeSingle();
    if (retry.data) return { ok: true, conversationId: retry.data.id };
    return { ok: false, error: ins.error.message };
  }
  return { ok: true, conversationId: ins.data.id };
}

// Envia mensagem numa conversa. Realtime propaga o INSERT ao outro participante.
export async function sendDirectMessage(conversationId: string, body: string): Promise<DMResult> {
  if (!uuid(conversationId)) return { ok: false, error: "Conversa inválida." };
  const me = await requireActiveProfile();
  if (!(await rateLimit(`dm:${me.id}`, { limit: 30, windowMs: 60_000 })).ok) {
    return { ok: false, error: RATE_MSG };
  }

  const parsed = messageSchema.safeParse({ body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensagem inválida" };
  }
  if (hasProfanity(parsed.data.body)) return { ok: false, error: PROFANITY_ERROR };

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("dm_conversations")
    .select("id, user_a, user_b")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return { ok: false, error: "Conversa não encontrada." };
  if (conv.user_a !== me.id && conv.user_b !== me.id) return { ok: false, error: "Sem permissão." };

  const other = conv.user_a === me.id ? conv.user_b : conv.user_a;
  const { data: blocked } = await supabase.rpc("is_dm_blocked", { other });
  if (blocked) return { ok: false, error: "Vocês não podem trocar mensagens." };

  const { data: msg, error } = await supabase
    .from("direct_messages")
    .insert({ conversation_id: conversationId, sender_id: me.id, body: parsed.data.body })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  const ts = nowIso();
  const patch =
    conv.user_a === me.id
      ? { last_message_at: ts, user_a_last_read_at: ts }
      : { last_message_at: ts, user_b_last_read_at: ts };
  await supabase.from("dm_conversations").update(patch).eq("id", conversationId);

  return { ok: true, id: msg.id };
}

export async function editDirectMessage(messageId: string, body: string): Promise<DMResult> {
  if (!uuid(messageId)) return { ok: false, error: "ID inválido." };
  const me = await requireActiveProfile();

  const parsed = messageSchema.safeParse({ body });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Mensagem inválida" };
  }
  if (hasProfanity(parsed.data.body)) return { ok: false, error: PROFANITY_ERROR };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("direct_messages")
    .select("sender_id, is_deleted")
    .eq("id", messageId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Mensagem não encontrada." };
  if (existing.sender_id !== me.id) return { ok: false, error: "Sem permissão." };
  if (existing.is_deleted) return { ok: false, error: "Mensagem removida." };

  const { error } = await supabase
    .from("direct_messages")
    .update({ body: parsed.data.body, edited_at: nowIso() })
    .eq("id", messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function deleteDirectMessage(messageId: string): Promise<DMResult> {
  if (!uuid(messageId)) return { ok: false, error: "ID inválido." };
  const me = await requireActiveProfile();

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("direct_messages")
    .select("sender_id")
    .eq("id", messageId)
    .maybeSingle();
  if (!existing) return { ok: false, error: "Mensagem não encontrada." };
  if (existing.sender_id !== me.id) return { ok: false, error: "Sem permissão." };

  const { error } = await supabase
    .from("direct_messages")
    .update({ is_deleted: true })
    .eq("id", messageId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Marca a conversa como lida ATÉ agora (atualiza o last_read do participante atual).
export async function markConversationRead(conversationId: string): Promise<DMResult> {
  if (!uuid(conversationId)) return { ok: false, error: "Conversa inválida." };
  const me = await requireActiveProfile();

  const supabase = await createClient();
  const { data: conv } = await supabase
    .from("dm_conversations")
    .select("user_a, user_b")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return { ok: false, error: "Conversa não encontrada." };
  if (conv.user_a !== me.id && conv.user_b !== me.id) return { ok: false, error: "Sem permissão." };

  const patch = conv.user_a === me.id ? { user_a_last_read_at: nowIso() } : { user_b_last_read_at: nowIso() };
  const { error } = await supabase.from("dm_conversations").update(patch).eq("id", conversationId);
  if (error) return { ok: false, error: error.message };

  // Marca lida a notificacao de DM dessa conversa (best-effort).
  await supabase
    .from("notifications")
    .update({ read_at: nowIso() })
    .eq("user_id", me.id)
    .eq("type", "dm")
    .eq("reference_type", "dm_conversation")
    .eq("reference_id", conversationId)
    .is("read_at", null);

  return { ok: true };
}

export async function blockUser(userId: string): Promise<DMResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireActiveProfile();
  if (userId === me.id) return { ok: false, error: "Ação inválida." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("dm_blocks")
    .upsert({ blocker_id: me.id, blocked_id: userId }, { onConflict: "blocker_id,blocked_id" });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function unblockUser(userId: string): Promise<DMResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireActiveProfile();

  const supabase = await createClient();
  const { error } = await supabase
    .from("dm_blocks")
    .delete()
    .eq("blocker_id", me.id)
    .eq("blocked_id", userId);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

export async function reportConversation(conversationId: string, reason: string): Promise<DMResult> {
  if (!uuid(conversationId)) return { ok: false, error: "Conversa inválida." };
  const me = await requireActiveProfile();

  const parsed = reportSchema.safeParse({ reason });
  if (!parsed.success) {
    return { ok: false, error: parsed.error.issues[0]?.message ?? "Motivo inválido" };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("dm_reports")
    .insert({ reporter_id: me.id, conversation_id: conversationId, reason: parsed.data.reason });
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Busca de membros para o seletor "nova conversa" (wrapper client-callable da query).
export async function searchMembers(query: string): Promise<DMMemberOption[]> {
  return listMembersForDM(query);
}

// Prévia das conversas para o painel rápido do header (client-callable, top 8).
export async function getConversationsPreview(): Promise<DMConversationSummary[]> {
  return (await getConversations()).slice(0, 8);
}
