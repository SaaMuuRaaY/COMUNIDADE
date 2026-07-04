"use server";

import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";
import { getNotifications, type Notification } from "@/server/queries/notifications";

export type ActionResult = { ok: boolean; error?: string };

export async function markAllNotificationsRead(): Promise<ActionResult> {
  const profile = await requireProfile();
  const supabase = await createClient();
  const { error } = await supabase
    .from("notifications")
    .update({ read_at: new Date().toISOString() })
    .eq("user_id", profile.id)
    .is("read_at", null);
  if (error) return { ok: false, error: error.message };
  return { ok: true };
}

// Prévia para o painel do sino (client-callable, top 8).
export async function getNotificationsPreview(): Promise<Notification[]> {
  return (await getNotifications(8));
}
