import type { Profile } from "@/types/db";

export function isOwner(profile: Profile | null): boolean {
  return !!profile && profile.is_owner === true && !profile.is_banned;
}

export function isAdmin(profile: Profile | null): boolean {
  return !!profile && profile.role === "admin" && !profile.is_banned;
}

export function isModerator(profile: Profile | null): boolean {
  return !!profile && !profile.is_banned && (profile.role === "admin" || profile.role === "moderator");
}

export function canPost(profile: Profile | null): boolean {
  return !!profile && !profile.is_banned;
}

export function canModerate(profile: Profile | null): boolean {
  return isModerator(profile);
}

export function canManageApps(profile: Profile | null): boolean {
  return isAdmin(profile);
}

export function canEditPost(profile: Profile | null, post: { author_id: string }): boolean {
  if (!profile || profile.is_banned) return false;
  return profile.id === post.author_id || isModerator(profile);
}

export function canManageAdmins(profile: Profile | null): boolean {
  return isOwner(profile);
}

/**
 * Decide se `actor` pode alterar role/ban de `target` na UI admin.
 * Owner só é gerenciável pelo owner; admin só é gerenciável pelo owner;
 * moderator/member são gerenciáveis por qualquer admin.
 */
export function canManageMember(
  actor: Profile | null,
  target: { role: "admin" | "moderator" | "member"; is_owner: boolean },
): boolean {
  if (!isAdmin(actor)) return false;
  if (target.is_owner) return isOwner(actor);
  if (target.role === "admin") return isOwner(actor);
  return true;
}
