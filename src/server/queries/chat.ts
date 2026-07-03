import "server-only";
import { createClient } from "@/lib/supabase/server";

export type ChatMessage = {
  id: string;
  body: string;
  created_at: string;
  is_deleted: boolean;
  edited_at: string | null;
  author_id: string;
  author_name: string | null;
  author_avatar: string | null;
};

/**
 * Histórico inicial da sala (cronológico asc). O realtime cuida das novas.
 * author_name/author_avatar são denormalizados na mensagem (o payload realtime
 * do postgres_changes entrega a linha crua, sem join).
 */
export async function getRecentMessages(room = "community", limit = 50): Promise<ChatMessage[]> {
  const supabase = await createClient();
  const { data } = await supabase
    .from("chat_messages")
    .select("id, body, created_at, is_deleted, edited_at, author_id, author_name, author_avatar")
    .eq("room", room)
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as ChatMessage[];
  return [...rows].reverse();
}
