"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";
import { profileUpdateSchema } from "@/lib/validations/schemas";

type Result = { ok: boolean; error?: string };

export async function updateProfileAction(formData: FormData): Promise<Result> {
  const profile = await requireProfile();
  const parsed = profileUpdateSchema.safeParse({
    full_name: formData.get("full_name"),
    username: formData.get("username"),
    bio: formData.get("bio") || null,
    avatar_url: formData.get("avatar_url") || null,
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", profile.id);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/profile");
  revalidatePath(`/members/${profile.id}`);
  return { ok: true };
}
