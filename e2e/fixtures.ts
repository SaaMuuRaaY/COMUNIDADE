import path from "node:path";

export const RUNTIME_DIR = path.join(__dirname, ".runtime");
export const USERS_FILE = path.join(RUNTIME_DIR, "users.json");
export const MEMBER_STATE = path.join(RUNTIME_DIR, "member.json");
export const ADMIN_STATE = path.join(RUNTIME_DIR, "admin.json");

export type E2EUser = {
  email: string;
  password: string;
  id: string;
  full_name: string;
  role: "member" | "admin";
};

export type E2EUsers = {
  member: E2EUser;
  admin: E2EUser;
  createdIds: string[];
};

/**
 * Canal onde o MEMBRO pode publicar (structure.ts: publish "member", comments true).
 * O Feed Geral (/community) é VIEW-ONLY desde a FEATURE 02 — publicar acontece nos canais.
 */
export const MEMBER_CHANNEL = "/apresente-se";
export const MEMBER_CHANNEL_CTA = "Criar apresentação";

/** Rotas privadas do membro — usadas no smoke de integridade. */
export const MEMBER_ROUTES = [
  "/dashboard",
  "/community",
  "/courses",
  "/resources",
  "/apps",
  "/leaderboard",
  "/profile",
  "/notifications",
  "/calendar",
];

/** Telas admin — usadas no smoke de integridade. */
export const ADMIN_ROUTES = [
  "/admin",
  "/admin/courses",
  "/admin/posts",
  "/admin/members",
  "/admin/resources",
  "/admin/apps",
  "/admin/events",
  "/admin/settings",
];
