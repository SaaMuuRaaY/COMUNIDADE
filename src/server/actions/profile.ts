"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile } from "@/lib/auth/current-user";
import { profileUpdateSchema, socialLinksSchema } from "@/lib/validations/schemas";

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

  const social = socialLinksSchema.safeParse({
    instagram: formData.get("social_instagram"),
    tiktok: formData.get("social_tiktok"),
    linkedin: formData.get("social_linkedin"),
    github: formData.get("social_github"),
    youtube: formData.get("social_youtube"),
  });
  if (!social.success) {
    return { ok: false, error: social.error.issues[0]?.message ?? "Link de rede social inválido" };
  }

  const supabase = await createClient();

  // 1) Campos de vitrine (inalterado) — nunca quebra.
  const { error } = await supabase.from("profiles").update(parsed.data).eq("id", profile.id);
  if (error) return { ok: false, error: error.message };

  // 2) social_links em UPDATE separado e TOLERANTE à coluna ausente (antes da
  //    migration 0011). Assim o save de nome/bio/avatar funciona mesmo sem a coluna.
  const socialLinks = Object.fromEntries(
    Object.entries(social.data).filter(([, v]) => v != null),
  );
  const { error: socialErr } = await supabase
    .from("profiles")
    .update({ social_links: socialLinks })
    .eq("id", profile.id);
  if (socialErr && !/social_links|column|schema cache/i.test(socialErr.message)) {
    return { ok: false, error: socialErr.message };
  }

  revalidatePath("/profile");
  revalidatePath(`/members/${profile.id}`);
  return { ok: true };
}
