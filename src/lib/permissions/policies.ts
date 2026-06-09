import type { Profile } from "@/types/db";

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
