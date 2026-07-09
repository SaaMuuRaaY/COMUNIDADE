"use server";

import { z } from "zod";
import { revalidatePath, updateTag } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-user";
import { SETTING_KEYS } from "@/lib/config/settings";
import type { Json } from "@/types/db";

type Result = { ok: boolean; error?: string };

const settingKeySchema = z.enum(SETTING_KEYS);

// Traduz a mensagem crua das exceções das RPCs (sem acento) para PT-BR amigável.
function friendlyAdminError(raw: string): string {
  const m = raw.toLowerCase();
  if (m.includes("ultimo admin")) return "Não é possível remover o último administrador.";
  if (m.includes("proprio acesso")) return "Você não pode remover seu próprio acesso de administrador.";
  if (m.includes("banir a si")) return "Você não pode banir a si mesmo.";
  if (m.includes("owner nao pode ser banido")) return "O dono (owner) não pode ser banido.";
  if (m.includes("somente o owner pode banir")) return "Apenas o dono (owner) pode banir um administrador.";
  if (m.includes("somente o owner pode alterar")) return "Apenas o dono (owner) pode alterar este usuário.";
  if (m.includes("forbidden")) return "Sem permissão para esta ação.";
  return "Não foi possível concluir a ação. Tente novamente.";
}

export async function setMemberRoleAction(
  userId: string,
  role: "admin" | "moderator" | "member",
): Promise<Result> {
  await requireAdmin();

  // Toda a regra crítica (anti-lockout, último admin, proteção de owner) vive na
  // RPC transacional admin_set_role (SECURITY DEFINER + FOR UPDATE) — corrige SEC-05.
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_role", { p_user: userId, p_role: role });
  if (error) return { ok: false, error: friendlyAdminError(error.message) };

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function setMemberBannedAction(userId: string, banned: boolean): Promise<Result> {
  await requireAdmin();

  // Regras (anti auto-ban, proteção de owner, admin só banível pelo owner) na RPC.
  const supabase = await createClient();
  const { error } = await supabase.rpc("admin_set_banned", { p_user: userId, p_banned: banned });
  if (error) return { ok: false, error: friendlyAdminError(error.message) };

  revalidatePath("/admin/members");
  return { ok: true };
}

export async function updateSettingAction(key: string, value: unknown): Promise<Result> {
  await requireAdmin();

  // Só chaves conhecidas — evita poluição/injeção de chaves arbitrárias.
  const parsedKey = settingKeySchema.safeParse(key);
  if (!parsedKey.success) {
    return { ok: false, error: "Configuração inválida." };
  }

  const supabase = await createClient();
  const { error } = await supabase
    .from("settings")
    .upsert({ key: parsedKey.data, value: value as Json, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  // updateTag (Next 16): read-your-own-writes — o admin ve o valor salvo na hora.
  updateTag("settings");
  revalidatePath("/admin/settings");
  return { ok: true };
}
