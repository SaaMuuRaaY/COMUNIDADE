"use server";

import { z } from "zod";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireAdmin } from "@/lib/auth/current-user";

type Result = { ok: boolean; error?: string };

const SETTING_KEYS = [
  "community.name",
  "community.description",
  "community.primary_color",
  "community.visibility",
] as const;
const settingKeySchema = z.enum(SETTING_KEYS);

export async function setMemberRoleAction(
  userId: string,
  role: "admin" | "moderator" | "member",
): Promise<Result> {
  const me = await requireAdmin();

  // Impede o admin de remover o próprio acesso (lockout).
  if (userId === me.id && role !== "admin") {
    return { ok: false, error: "Você não pode remover seu próprio acesso de administrador." };
  }

  const supabase = await createClient();

  // Impede remover o último administrador da comunidade.
  if (role !== "admin") {
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (target?.role === "admin") {
      const { count } = await supabase
        .from("profiles")
        .select("id", { count: "exact", head: true })
        .eq("role", "admin");
      if ((count ?? 0) <= 1) {
        return { ok: false, error: "Não é possível remover o último administrador." };
      }
    }
  }

  const { error } = await supabase.from("profiles").update({ role }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/members");
  return { ok: true };
}

export async function setMemberBannedAction(userId: string, banned: boolean): Promise<Result> {
  const me = await requireAdmin();

  // Impede auto-ban (lockout).
  if (userId === me.id) {
    return { ok: false, error: "Você não pode banir a si mesmo." };
  }

  const supabase = await createClient();

  // Impede banir outro administrador.
  if (banned) {
    const { data: target } = await supabase
      .from("profiles")
      .select("role")
      .eq("id", userId)
      .maybeSingle();
    if (target?.role === "admin") {
      return { ok: false, error: "Não é possível banir outro administrador." };
    }
  }

  const { error } = await supabase.from("profiles").update({ is_banned: banned }).eq("id", userId);
  if (error) return { ok: false, error: error.message };
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
    .upsert({ key: parsedKey.data, value, updated_at: new Date().toISOString() }, { onConflict: "key" });
  if (error) return { ok: false, error: error.message };
  revalidatePath("/admin/settings");
  return { ok: true };
}
