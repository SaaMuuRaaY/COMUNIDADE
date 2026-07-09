import "server-only";
import { unstable_cache } from "next/cache";
import { createAdminClient } from "@/lib/supabase/admin";
import type { SettingKey, SettingsMap } from "@/lib/config/settings";

/**
 * Configuracoes da comunidade. Sao globais (iguais p/ todos) e mudam raramente:
 * usamos o client service-role (sem cookies, requisito do unstable_cache) e
 * cacheamos com a tag "settings", invalidada por updateSettingAction.
 */
const cachedSettings = unstable_cache(
  async (): Promise<SettingsMap> => {
    const supabase = createAdminClient();
    const { data } = await supabase.from("settings").select("key, value");
    const map: SettingsMap = {};
    for (const row of data ?? []) {
      map[row.key as SettingKey] = row.value;
    }
    return map;
  },
  ["settings"],
  { revalidate: 300, tags: ["settings"] },
);

export function getSettings(): Promise<SettingsMap> {
  return cachedSettings();
}
