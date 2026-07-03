import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireActiveProfile, requireAdmin } from "@/lib/auth/current-user";

export type DMMemberOption = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
};

export type DMMessage = {
  id: string;
  sender_id: string;
  body: string;
  is_deleted: boolean;
  edited_at: string | null;
  created_at: string;
};

export type DMConversationSummary = {
  id: string;
  other: DMMemberOption | null;
  lastMessage: { body: string; created_at: string; is_deleted: boolean; mine: boolean } | null;
  unread: boolean;
  last_message_at: string;
};

export type DMConversationHeader = {
  id: string;
  other: DMMemberOption | null;
  iBlocked: boolean;
};

// Ids que o usuario atual bloqueou (so os proprios sao visiveis por RLS).
async function myBlockedIds(supabase: Awaited<ReturnType<typeof createClient>>, meId: string) {
  const { data } = await supabase.from("dm_blocks").select("blocked_id").eq("blocker_id", meId);
  return new Set((data ?? []).map((b) => b.blocked_id));
}

// Inbox: minhas conversas (mais recentes primeiro) com o outro participante,
// preview da ultima mensagem e flag de nao-lida (last_message_at > meu last_read).
export async function getConversations(): Promise<DMConversationSummary[]> {
  const me = await requireActiveProfile();
  const supabase = await createClient();

  const { data: convs } = await supabase
    .from("dm_conversations")
    .select("id, user_a, user_b, last_message_at, user_a_last_read_at, user_b_last_read_at")
    .or(`user_a.eq.${me.id},user_b.eq.${me.id}`)
    .order("last_message_at", { ascending: false })
    .limit(100);
  if (!convs?.length) return [];

  const otherIds = convs.map((c) => (c.user_a === me.id ? c.user_b : c.user_a));
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", otherIds);
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

  const convIds = convs.map((c) => c.id);
  const { data: msgs } = await supabase
    .from("direct_messages")
    .select("conversation_id, sender_id, body, is_deleted, created_at")
    .in("conversation_id", convIds)
    .order("created_at", { ascending: false })
    .limit(500);
  const latest = new Map<string, NonNullable<typeof msgs>[number]>();
  for (const m of msgs ?? []) {
    if (!latest.has(m.conversation_id)) latest.set(m.conversation_id, m);
  }

  return convs.map((c) => {
    const otherId = c.user_a === me.id ? c.user_b : c.user_a;
    const myRead = c.user_a === me.id ? c.user_a_last_read_at : c.user_b_last_read_at;
    const last = latest.get(c.id);
    return {
      id: c.id,
      other: pmap.get(otherId) ?? null,
      lastMessage: last
        ? { body: last.body, created_at: last.created_at, is_deleted: last.is_deleted, mine: last.sender_id === me.id }
        : null,
      unread: new Date(c.last_message_at).getTime() > new Date(myRead).getTime(),
      last_message_at: c.last_message_at,
    };
  });
}

// Historico da conversa (cronologico asc). RLS garante participante-ou-admin.
export async function getConversationMessages(conversationId: string, limit = 50): Promise<DMMessage[]> {
  await requireActiveProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("direct_messages")
    .select("id, sender_id, body, is_deleted, edited_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: false })
    .limit(limit);
  const rows = (data ?? []) as DMMessage[];
  return [...rows].reverse();
}

// Cabecalho da conversa (o outro participante + se EU o bloqueei). null se nao acessivel.
export async function getConversationById(conversationId: string): Promise<DMConversationHeader | null> {
  const me = await requireActiveProfile();
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("dm_conversations")
    .select("id, user_a, user_b")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;

  const otherId = conv.user_a === me.id ? conv.user_b : conv.user_a;
  const { data: other } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .eq("id", otherId)
    .maybeSingle();

  const { data: block } = await supabase
    .from("dm_blocks")
    .select("blocked_id")
    .eq("blocker_id", me.id)
    .eq("blocked_id", otherId)
    .maybeSingle();

  return { id: conv.id, other: other ?? null, iBlocked: !!block };
}

// Seletor "nova conversa": membros ativos (exclui eu e quem eu bloqueei), busca opcional.
export async function listMembersForDM(search = ""): Promise<DMMemberOption[]> {
  const me = await requireActiveProfile();
  const supabase = await createClient();

  let q = supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .neq("id", me.id)
    .eq("is_banned", false)
    .order("full_name", { ascending: true })
    .limit(20);

  const s = search.replace(/[,()*%\\]/g, "").trim().slice(0, 50);
  if (s) q = q.or(`full_name.ilike.%${s}%,username.ilike.%${s}%`);

  const { data } = await q;
  const blocked = await myBlockedIds(supabase, me.id);
  return (data ?? []).filter((p) => !blocked.has(p.id));
}

// Total de conversas com mensagens nao lidas (badge da nav).
export async function getUnreadDmCount(): Promise<number> {
  const supabase = await createClient();
  const { data } = await supabase.rpc("dm_unread_count");
  return typeof data === "number" ? data : 0;
}

// ---- Admin (auditoria de denuncias) --------------------------------------

export type DMReport = {
  id: string;
  reason: string;
  created_at: string;
  reporter: DMMemberOption | null;
  conversation_id: string;
  participants: DMMemberOption[];
};

// Lista de denuncias (admin). RLS de dm_reports/dm_conversations libera pro admin.
export async function getDmReports(): Promise<DMReport[]> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: reports } = await supabase
    .from("dm_reports")
    .select("id, reason, created_at, reporter_id, conversation_id")
    .order("created_at", { ascending: false })
    .limit(100);
  if (!reports?.length) return [];

  const convIds = [...new Set(reports.map((r) => r.conversation_id))];
  const { data: convs } = await supabase
    .from("dm_conversations")
    .select("id, user_a, user_b")
    .in("id", convIds);
  const convMap = new Map((convs ?? []).map((c) => [c.id, c]));

  const userIds = new Set<string>();
  reports.forEach((r) => userIds.add(r.reporter_id));
  (convs ?? []).forEach((c) => {
    userIds.add(c.user_a);
    userIds.add(c.user_b);
  });
  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", [...userIds]);
  const pmap = new Map((profiles ?? []).map((p) => [p.id, p]));

  return reports.map((r) => {
    const c = convMap.get(r.conversation_id);
    const participants = c
      ? ([pmap.get(c.user_a), pmap.get(c.user_b)].filter(Boolean) as DMMemberOption[])
      : [];
    return {
      id: r.id,
      reason: r.reason,
      created_at: r.created_at,
      reporter: pmap.get(r.reporter_id) ?? null,
      conversation_id: r.conversation_id,
      participants,
    };
  });
}

// Conteudo de UMA conversa para auditoria (admin, read-only).
export async function getAdminConversation(
  conversationId: string,
): Promise<{ messages: DMMessage[]; participants: DMMemberOption[] } | null> {
  await requireAdmin();
  const supabase = await createClient();

  const { data: conv } = await supabase
    .from("dm_conversations")
    .select("id, user_a, user_b")
    .eq("id", conversationId)
    .maybeSingle();
  if (!conv) return null;

  const { data: profiles } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url")
    .in("id", [conv.user_a, conv.user_b]);

  const { data: msgs } = await supabase
    .from("direct_messages")
    .select("id, sender_id, body, is_deleted, edited_at, created_at")
    .eq("conversation_id", conversationId)
    .order("created_at", { ascending: true });

  return { messages: (msgs ?? []) as DMMessage[], participants: (profiles ?? []) as DMMemberOption[] };
}
