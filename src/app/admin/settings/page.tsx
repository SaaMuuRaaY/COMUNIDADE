import { getSettings } from "@/server/queries/settings";
import { settingString, settingBoolean } from "@/lib/config/settings";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações · Admin" };

export default async function AdminSettingsPage() {
  const map = await getSettings();

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações da comunidade</h1>
      <SettingsForm
        initial={{
          name: settingString(map, "community.name") ?? "",
          description: settingString(map, "community.description") ?? "",
          primary_color: settingString(map, "community.primary_color") ?? "#0a0a0a",
          visibility:
            settingString(map, "community.visibility") === "public" ? "public" : "private",
          whatsapp_enabled: settingBoolean(map, "whatsapp_invite.enabled"),
          whatsapp_url: settingString(map, "whatsapp_invite.url") ?? "",
          whatsapp_title: settingString(map, "whatsapp_invite.title") ?? "",
          whatsapp_description: settingString(map, "whatsapp_invite.description") ?? "",
        }}
      />
    </div>
  );
}
