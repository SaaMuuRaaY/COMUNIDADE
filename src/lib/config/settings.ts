import type { Json } from "@/types/db";

/**
 * Whitelist de chaves de `settings` (key/value jsonb). Evita poluicao/injecao de
 * chaves arbitrarias. Vive fora de admin.ts porque arquivos "use server" so podem
 * exportar funcoes async — aqui a constante e compartilhada pela action e pela query.
 */
export const SETTING_KEYS = [
  "community.name",
  "community.description",
  "community.primary_color",
  "community.visibility",
  "welcome_video.enabled",
  "welcome_video.url",
  "welcome_video.title",
] as const;

export type SettingKey = (typeof SETTING_KEYS)[number];
export type SettingsMap = Partial<Record<SettingKey, Json>>;

export function settingString(map: SettingsMap, key: SettingKey): string | null {
  const value = map[key];
  return typeof value === "string" && value.trim() ? value : null;
}

export function settingBoolean(map: SettingsMap, key: SettingKey): boolean {
  return map[key] === true;
}
