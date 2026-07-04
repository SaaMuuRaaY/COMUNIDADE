import "server-only";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";

export type ConnectionProfile = {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  level: number;
  role: string;
};

export type FriendshipState = "none" | "pending_sent" | "pending_received" | "friends";
export type ConnectionState = { isFollowing: boolean; friendship: FriendshipState };
export type ConnectionCounts = { followers: number; following: number; friends: number };

const PROFILE_COLS = "id, full_name, username, avatar_url, level, role";
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

function mapProfiles(rows: unknown, key: string): ConnectionProfile[] {
  return ((rows ?? []) as Array<Record<string, unknown>>)
    .map((r) => {
      const raw = r[key] as Record<string, unknown> | Record<string, unknown>[] | null;
      const p = Array.isArray(raw) ? raw[0] ?? null : raw;
      if (!p) return null;
      return {
        id: p.id as string,
        full_name: (p.full_name as string | null) ?? null,
        username: (p.username as string | null) ?? null,
        avatar_url: (p.avatar_url as string | null) ?? null,
        level: (p.level as number) ?? 1,
        role: (p.role as string) ?? "member",
      };
    })
    .filter(Boolean) as ConnectionProfile[];
}

// Estado da relacao entre o usuario atual e `otherId` (para os botoes do perfil).
export async function getConnectionState(otherId: string): Promise<ConnectionState> {
  const me = await requireProfile();
  if (!UUID.test(otherId) || otherId === me.id) return { isFollowing: false, friendship: "none" };
  const supabase = await createClient();

  const [followRes, frRes] = await Promise.all([
    supabase
      .from("follows")
      .select("following_id")
      .eq("follower_id", me.id)
      .eq("following_id", otherId)
      .maybeSingle(),
    supabase
      .from("friendships")
      .select("requester_id, status")
      .or(
        `and(requester_id.eq.${me.id},addressee_id.eq.${otherId}),and(requester_id.eq.${otherId},addressee_id.eq.${me.id})`,
      )
      .maybeSingle(),
  ]);

  let friendship: FriendshipState = "none";
  if (frRes.data) {
    if (frRes.data.status === "accepted") friendship = "friends";
    else friendship = frRes.data.requester_id === me.id ? "pending_sent" : "pending_received";
  }
  return { isFollowing: !!followRes.data, friendship };
}

export async function getConnectionCounts(userId: string): Promise<ConnectionCounts> {
  if (!UUID.test(userId)) return { followers: 0, following: 0, friends: 0 };
  const supabase = await createClient();
  const [followers, following, friends] = await Promise.all([
    supabase.from("follows").select("follower_id", { count: "exact", head: true }).eq("following_id", userId),
    supabase.from("follows").select("following_id", { count: "exact", head: true }).eq("follower_id", userId),
    supabase
      .from("friendships")
      .select("id", { count: "exact", head: true })
      .eq("status", "accepted")
      .or(`requester_id.eq.${userId},addressee_id.eq.${userId}`),
  ]);
  return {
    followers: followers.count ?? 0,
    following: following.count ?? 0,
    friends: friends.count ?? 0,
  };
}

// Quem `userId` segue.
export async function getFollowing(userId: string, limit = 100): Promise<ConnectionProfile[]> {
  if (!UUID.test(userId)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select(`profile:profiles!follows_following_id_fkey(${PROFILE_COLS})`)
    .eq("follower_id", userId)
    .limit(limit);
  return mapProfiles(data, "profile");
}

// Quem segue `userId`.
export async function getFollowers(userId: string, limit = 100): Promise<ConnectionProfile[]> {
  if (!UUID.test(userId)) return [];
  const supabase = await createClient();
  const { data } = await supabase
    .from("follows")
    .select(`profile:profiles!follows_follower_id_fkey(${PROFILE_COLS})`)
    .eq("following_id", userId)
    .limit(limit);
  return mapProfiles(data, "profile");
}

// Amigos (aceitos) de `userId` — o "outro lado" de cada amizade.
export async function getFriends(userId: string, limit = 100): Promise<ConnectionProfile[]> {
  if (!UUID.test(userId)) return [];
  const supabase = await createClient();
  const [asRequester, asAddressee] = await Promise.all([
    supabase
      .from("friendships")
      .select(`profile:profiles!friendships_addressee_id_fkey(${PROFILE_COLS})`)
      .eq("requester_id", userId)
      .eq("status", "accepted")
      .limit(limit),
    supabase
      .from("friendships")
      .select(`profile:profiles!friendships_requester_id_fkey(${PROFILE_COLS})`)
      .eq("addressee_id", userId)
      .eq("status", "accepted")
      .limit(limit),
  ]);
  return [...mapProfiles(asRequester.data, "profile"), ...mapProfiles(asAddressee.data, "profile")].slice(
    0,
    limit,
  );
}

// Solicitacoes de amizade RECEBIDAS pelo usuario atual (pendentes).
export async function getPendingRequests(
  limit = 50,
): Promise<Array<ConnectionProfile & { requestedAt: string }>> {
  const me = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("friendships")
    .select(`created_at, requester:profiles!friendships_requester_id_fkey(${PROFILE_COLS})`)
    .eq("addressee_id", me.id)
    .eq("status", "pending")
    .order("created_at", { ascending: false })
    .limit(limit);

  const rows = (data ?? []) as Array<Record<string, unknown>>;
  return mapProfiles(rows, "requester").map((p, i) => ({
    ...p,
    requestedAt: rows[i].created_at as string,
  }));
}

export async function getPendingRequestCount(): Promise<number> {
  const me = await requireProfile();
  const supabase = await createClient();
  const { count } = await supabase
    .from("friendships")
    .select("id", { count: "exact", head: true })
    .eq("addressee_id", me.id)
    .eq("status", "pending");
  return count ?? 0;
}
