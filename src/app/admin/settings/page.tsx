import { createClient } from "@/lib/supabase/server";
import { SettingsForm } from "./settings-form";

export const metadata = { title: "Configurações · Admin" };

type SettingsMap = {
  "community.name"?: string;
  "community.description"?: string;
  "community.primary_color"?: string;
  "community.visibility"?: "public" | "private";
};

export default async function AdminSettingsPage() {
  const supabase = await createClient();
  const { data } = await supabase.from("settings").select("key, value");
  const map: SettingsMap = {};
  (data ?? []).forEach((row) => {
    const key = row.key as keyof SettingsMap;
    const value = row.value as SettingsMap[typeof key];
    if (key) map[key] = value as never;
  });

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Configurações da comunidade</h1>
      <SettingsForm
        initial={{
          name: (map["community.name"] as string) ?? "",
          description: (map["community.description"] as string) ?? "",
          primary_color: (map["community.primary_color"] as string) ?? "#0a0a0a",
          visibility: (map["community.visibility"] as "public" | "private") ?? "private",
        }}
      />
    </div>
  );
}
