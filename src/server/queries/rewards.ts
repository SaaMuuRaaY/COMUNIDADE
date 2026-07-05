import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";

/** Primeiro dia do mes corrente (UTC), formato YYYY-MM-DD — chave da tabela rewards. */
export function currentMonthStart(): string {
  const now = new Date();
  return `${now.getUTCFullYear()}-${String(now.getUTCMonth() + 1).padStart(2, "0")}-01`;
}

export type RewardWinner = {
  user_id: string;
  rank: number;
  month: string;
  full_name: string | null;
  avatar_url: string | null;
};

/** Vencedores de um mes (default: mes mais recente ja emitido). Leitura publica. */
export async function getRewardWinners(monthISO?: string): Promise<RewardWinner[]> {
  const supabase = await createClient();

  let month = monthISO;
  if (!month) {
    const { data: latest } = await supabase
      .from("rewards")
      .select("month")
      .order("month", { ascending: false })
      .limit(1)
      .maybeSingle();
    if (!latest) return [];
    month = latest.month as string;
  }

  const { data } = await supabase
    .from("rewards")
    .select("user_id, rank, month, profiles(full_name, avatar_url)")
    .eq("month", month)
    .order("rank", { ascending: true });

  return (data ?? []).map((r) => {
    const prof = Array.isArray(r.profiles) ? r.profiles[0] : r.profiles;
    return {
      user_id: r.user_id as string,
      rank: r.rank as number,
      month: r.month as string,
      full_name: (prof?.full_name as string | null) ?? null,
      avatar_url: (prof?.avatar_url as string | null) ?? null,
    };
  });
}

export type MonthlyRankRow = {
  user_id: string;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  monthly_points: number;
};

/**
 * Ranking do mes corrente a partir do points_ledger (via RPC get_monthly_ranking,
 * SECURITY DEFINER). Global (mesmo p/ todos), entao usa client service-role (sem
 * cookies) + unstable_cache 180s — mesmo padrao do trending.
 */
const cachedMonthly = unstable_cache(
  async (limit: number): Promise<MonthlyRankRow[]> => {
    const supabase = createAdminClient();
    const { data } = await supabase.rpc("get_monthly_ranking", { p_limit: limit });
    return (data ?? []).map((r) => ({
      user_id: r.user_id,
      full_name: r.full_name,
      avatar_url: r.avatar_url,
      level: r.level ?? 1,
      monthly_points: Number(r.monthly_points ?? 0),
    }));
  },
  ["monthly-ranking"],
  { revalidate: 180, tags: ["monthly-ranking"] },
);

export function getMonthlyRanking(limit = 50) {
  return cachedMonthly(limit);
}
