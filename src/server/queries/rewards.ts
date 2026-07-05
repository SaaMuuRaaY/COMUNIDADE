import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";

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
