"use server";

import { revalidatePath } from "next/cache";
import { requireAdmin } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

type Result = { ok: boolean; error?: string };

/**
 * Define (substitui) os vencedores do mes. Selecao MANUAL do admin a partir do
 * ranking. Apaga os vencedores atuais do mes e grava a nova selecao. requireAdmin
 * + RLS is_admin (defesa em profundidade).
 */
export async function setMonthlyWinnersAction(
  monthISO: string,
  winners: { userId: string; rank: number }[],
): Promise<Result> {
  const admin = await requireAdmin();

  if (!/^\d{4}-\d{2}-01$/.test(monthISO)) {
    return { ok: false, error: "Mês inválido." };
  }
  if (winners.length === 0) {
    return { ok: false, error: "Selecione ao menos 1 vencedor." };
  }
  const ranks = new Set(winners.map((w) => w.rank));
  const users = new Set(winners.map((w) => w.userId));
  if (ranks.size !== winners.length || users.size !== winners.length) {
    return { ok: false, error: "Posições e usuários devem ser únicos." };
  }
  if (winners.some((w) => w.rank < 1 || w.rank > 3)) {
    return { ok: false, error: "Posições válidas: 1 a 3." };
  }

  const supabase = await createClient();

  // Valida que todos os vencedores ainda existem ANTES de apagar os atuais —
  // senao o DELETE apaga e o INSERT falha por FK, deixando o mes sem vencedores.
  const userIds = winners.map((w) => w.userId);
  const { data: found } = await supabase.from("profiles").select("id").in("id", userIds);
  if (!found || found.length !== userIds.length) {
    return { ok: false, error: "Um ou mais vencedores selecionados não existem mais." };
  }

  const { error: delErr } = await supabase.from("rewards").delete().eq("month", monthISO);
  if (delErr) return { ok: false, error: delErr.message };

  const { error: insErr } = await supabase.from("rewards").insert(
    winners.map((w) => ({
      user_id: w.userId,
      month: monthISO,
      rank: w.rank,
      emitted_by: admin.id,
    })),
  );
  if (insErr) return { ok: false, error: insErr.message };

  revalidatePath("/rewards");
  revalidatePath("/admin/rewards");
  return { ok: true };
}
