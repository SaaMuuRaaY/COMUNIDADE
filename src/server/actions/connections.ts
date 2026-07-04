"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";
import { rateLimit } from "@/lib/security/rate-limit";
import { getPendingRequests, type ConnectionProfile } from "@/server/queries/connections";

export type ActionResult = { ok: boolean; error?: string };

const RATE = "Muitas ações em pouco tempo. Aguarde um momento.";
const uuid = (v: string) => z.string().uuid().safeParse(v).success;
const pairOr = (a: string, b: string) =>
  `and(requester_id.eq.${a},addressee_id.eq.${b}),and(requester_id.eq.${b},addressee_id.eq.${a})`;

function revalidateConn(userId: string) {
  revalidatePath(`/members/${userId}`);
  revalidatePath("/conexoes");
}

// --- Seguir (unilateral) ----------------------------------------------------

export async function followUser(userId: string): Promise<ActionResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireProfile();
  if (me.is_banned) return { ok: false, error: "Usuário banido." };
  if (userId === me.id) return { ok: false, error: "Ação inválida." };
  if (!rateLimit(`follow:${me.id}`, { limit: 60, windowMs: 60_000 }).ok) return { ok: false, error: RATE };

  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .upsert({ follower_id: me.id, following_id: userId }, { onConflict: "follower_id,following_id" });
  if (error) return { ok: false, error: error.message };
  revalidateConn(userId);
  return { ok: true };
}

export async function unfollowUser(userId: string): Promise<ActionResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("follows")
    .delete()
    .eq("follower_id", me.id)
    .eq("following_id", userId);
  if (error) return { ok: false, error: error.message };
  revalidateConn(userId);
  return { ok: true };
}

// --- Amigos (pedido -> aceite) ----------------------------------------------

export async function sendFriendRequest(userId: string): Promise<ActionResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireProfile();
  if (me.is_banned) return { ok: false, error: "Usuário banido." };
  if (userId === me.id) return { ok: false, error: "Ação inválida." };
  if (!rateLimit(`friend:${me.id}`, { limit: 30, windowMs: 60_000 }).ok) return { ok: false, error: RATE };

  const supabase = await createClient();
  const { data: existing } = await supabase
    .from("friendships")
    .select("id")
    .or(pairOr(me.id, userId))
    .maybeSingle();
  if (existing) return { ok: false, error: "Já existe uma relação com este membro." };

  const { error } = await supabase.from("friendships").insert({ requester_id: me.id, addressee_id: userId });
  if (error) {
    // 23505 = corrida (A->B e B->A simultaneos) barrada pelo indice unico canonico.
    if (error.code === "23505") return { ok: false, error: "Já existe uma relação com este membro." };
    console.error("[connections] pedido de amizade:", error.message);
    return { ok: false, error: "Não foi possível enviar a solicitação. Tente novamente." };
  }
  revalidateConn(userId);
  return { ok: true };
}

// Cancela a solicitacao que EU enviei.
export async function cancelFriendRequest(userId: string): Promise<ActionResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("requester_id", me.id)
    .eq("addressee_id", userId)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  revalidateConn(userId);
  return { ok: true };
}

// Aceita a solicitacao que RECEBI de `userId` (eu sou o addressee).
export async function acceptFriendRequest(userId: string): Promise<ActionResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireProfile();
  if (me.is_banned) return { ok: false, error: "Usuário banido." };
  const supabase = await createClient();
  const { error } = await supabase
    .from("friendships")
    .update({ status: "accepted", updated_at: new Date().toISOString() })
    .eq("requester_id", userId)
    .eq("addressee_id", me.id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  revalidateConn(userId);
  return { ok: true };
}

// Recusa (remove) a solicitacao que RECEBI de `userId`.
export async function declineFriendRequest(userId: string): Promise<ActionResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("requester_id", userId)
    .eq("addressee_id", me.id)
    .eq("status", "pending");
  if (error) return { ok: false, error: error.message };
  revalidateConn(userId);
  return { ok: true };
}

// Desfaz amizade aceita (qualquer direcao).
export async function removeFriend(userId: string): Promise<ActionResult> {
  if (!uuid(userId)) return { ok: false, error: "Usuário inválido." };
  const me = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("friendships")
    .delete()
    .eq("status", "accepted")
    .or(pairOr(me.id, userId));
  if (error) return { ok: false, error: error.message };
  revalidateConn(userId);
  return { ok: true };
}

// Prévia das solicitações pendentes para o painel do header (client-callable).
export async function getPendingRequestsPreview(): Promise<Array<ConnectionProfile & { requestedAt: string }>> {
  return getPendingRequests(8);
}
