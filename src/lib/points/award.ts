import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import type { PointsAction } from "@/types/db";

/**
 * Premia pontos de forma idempotente. A unique constraint em points_ledger
 * (user_id, action, reference_type, reference_id) garante que a mesma ação
 * sobre o mesmo recurso não pontue duas vezes.
 */
export async function awardPoints(
  userId: string,
  action: PointsAction,
  points: number,
  referenceType: string | null,
  referenceId: string | null,
): Promise<{ ok: boolean; error?: string }> {
  const admin = createAdminClient();
  const { error } = await admin.rpc("award_points", {
    p_user: userId,
    p_action: action,
    p_points: points,
    // RPC aceita string|undefined; `null` (ref ausente) vira omissão → o default
    // `null` da função SQL produz o mesmo resultado no banco.
    p_ref_type: referenceType ?? undefined,
    p_ref_id: referenceId ?? undefined,
  });
  if (error) {
    // Não vaza o objeto de erro completo; o caller decide como reagir.
    console.error(`[awardPoints] falha ao pontuar (user=${userId}, action=${action}): ${error.message}`);
    return { ok: false, error: error.message };
  }
  return { ok: true };
}
