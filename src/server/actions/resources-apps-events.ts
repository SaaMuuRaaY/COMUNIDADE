"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireAdmin } from "@/lib/auth/current-user";
import { awardPoints } from "@/lib/points/award";
import { resourceSchema, appSchema, eventSchema } from "@/lib/validations/schemas";
import { POINTS } from "@/lib/constants";
import { rateLimit } from "@/lib/security/rate-limit";
import { slugify } from "@/lib/utils";

type Result = { ok: boolean; error?: string; id?: string };

// Gera um slug único na tabela (slugify + sufixo -N em colisão). O índice unique
// da 0026 é o backstop final; este check evita a colisão comum.
async function uniqueSlug(
  supabase: Awaited<ReturnType<typeof createClient>>,
  table: "resources" | "apps",
  base: string,
): Promise<string> {
  const root = slugify(base) || (table === "apps" ? "aplicativo" : "recurso");
  for (let i = 1; i <= 50; i++) {
    const candidate = i === 1 ? root : `${root}-${i}`;
    const { data } = await supabase.from(table).select("id").eq("slug", candidate).maybeSingle();
    if (!data) return candidate;
  }
  return `${root}-${Date.now().toString(36)}`;
}

// Recursos -------------------------------------------------------------------
export async function createResourceAction(formData: FormData): Promise<Result> {
  const profile = await requireAdmin();
  const parsed = resourceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    category: formData.get("category"),
    file_url: formData.get("file_url") || null,
    file_storage_path: formData.get("file_storage_path") || null,
    file_type: formData.get("file_type") || null,
    cover_url: formData.get("cover_url") || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await createClient();
  const slug = await uniqueSlug(supabase, "resources", parsed.data.title);
  const { data, error } = await supabase
    .from("resources")
    .insert({ ...parsed.data, slug, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/resources");
  revalidatePath("/admin/resources");
  return { ok: true, id: data.id };
}

export async function updateResourceAction(id: string, formData: FormData): Promise<Result> {
  await requireAdmin();
  const parsed = resourceSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    category: formData.get("category"),
    file_url: formData.get("file_url") || null,
    file_storage_path: formData.get("file_storage_path") || null,
    file_type: formData.get("file_type") || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };
  const supabase = await createClient();
  const { error } = await supabase
    .from("resources")
    .update({
      title: parsed.data.title,
      description: parsed.data.description,
      category: parsed.data.category,
      file_url: parsed.data.file_url,
      file_type: parsed.data.file_type,
    })
    .eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/resources");
  revalidatePath("/admin/resources");
  return { ok: true, id };
}

export async function deleteResourceAction(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("resources").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/resources");
  revalidatePath("/admin/resources");
  return { ok: true };
}

// Apps -----------------------------------------------------------------------
export async function createAppAction(formData: FormData): Promise<Result> {
  const profile = await requireAdmin();
  const parsed = appSchema.safeParse({
    name: formData.get("name"),
    description: formData.get("description") || null,
    category: formData.get("category"),
    type: formData.get("type"),
    status: formData.get("status"),
    url: formData.get("url") || null,
    embed_url: formData.get("embed_url") || null,
    file_url: formData.get("file_url") || null,
    icon_url: formData.get("icon_url") || null,
    cover_url: formData.get("cover_url") || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const slug = await uniqueSlug(supabase, "apps", parsed.data.name);
  const { data, error } = await supabase
    .from("apps")
    .insert({ ...parsed.data, slug, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/apps");
  revalidatePath("/admin/apps");
  return { ok: true, id: data.id };
}

export async function deleteAppAction(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("apps").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/apps");
  revalidatePath("/admin/apps");
  return { ok: true };
}

// Eventos --------------------------------------------------------------------
export async function createEventAction(formData: FormData): Promise<Result> {
  const profile = await requireAdmin();
  const parsed = eventSchema.safeParse({
    title: formData.get("title"),
    description: formData.get("description") || null,
    event_type: formData.get("event_type"),
    starts_at: formData.get("starts_at"),
    ends_at: formData.get("ends_at") || null,
    external_url: formData.get("external_url") || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("events")
    .insert({ ...parsed.data, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/admin/events");
  return { ok: true, id: data.id };
}

export async function deleteEventAction(id: string): Promise<Result> {
  await requireAdmin();
  const supabase = await createClient();
  const { error } = await supabase.from("events").delete().eq("id", id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/calendar");
  revalidatePath("/admin/events");
  return { ok: true };
}

export async function rsvpEventAction(eventId: string, status: "going" | "maybe" | "declined" = "going"): Promise<Result> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };
  if (!(await rateLimit(`rsvp:${profile.id}`, { limit: 30, windowMs: 60_000 })).ok) {
    return { ok: false, error: "Muitas ações em pouco tempo. Aguarde um momento." };
  }
  const supabase = await createClient();
  const { error } = await supabase
    .from("event_attendees")
    .upsert(
      { event_id: eventId, user_id: profile.id, status },
      { onConflict: "event_id,user_id" },
    );
  if (error) {
    console.error("[events] rsvp:", error.message);
    return { ok: false, error: "Não foi possível confirmar a presença. Tente novamente." };
  }

  if (status === "going") {
    await awardPoints(profile.id, "event_attended", POINTS.EVENT_ATTENDED, "event", eventId);
  }

  revalidatePath("/calendar");
  return { ok: true };
}
