import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import type { Profile } from "@/types/db";

export const getCurrentUser = cache(async () => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user;
});

export const getCurrentProfile = cache(async (): Promise<Profile | null> => {
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  if (!user) return null;

  const { data } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .maybeSingle();

  return data as Profile | null;
});

export async function requireProfile(): Promise<Profile> {
  const profile = await getCurrentProfile();
  if (!profile) redirect("/login");
  return profile;
}

/**
 * Igual a requireProfile, mas bloqueia banidos: usuário com is_banned=true é
 * redirecionado para /banned. Use em todas as áreas autenticadas (layouts).
 * requireProfile continua existindo para usos internos que não devem redirecionar.
 */
export async function requireActiveProfile(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.is_banned) redirect("/banned");
  return profile;
}

export async function requireRole(roles: Array<"admin" | "moderator" | "member">): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.is_banned) redirect("/banned");
  if (!roles.includes(profile.role)) redirect("/dashboard");
  return profile;
}

export async function requireAdmin(): Promise<Profile> {
  return requireRole(["admin"]);
}

export async function requireOwner(): Promise<Profile> {
  const profile = await requireProfile();
  if (profile.is_banned) redirect("/banned");
  if (!profile.is_owner) redirect("/dashboard");
  return profile;
}

export async function requireModerator(): Promise<Profile> {
  return requireRole(["admin", "moderator"]);
}
