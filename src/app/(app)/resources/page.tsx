import { Library } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { ResourceBrowser, type ResourceItem } from "@/components/resources/resource-browser";
import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";

export const metadata = { title: "Recursos" };

export default async function ResourcesPage() {
  await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select("id, title, description, category, file_url")
    .order("created_at", { ascending: false });

  const items: ResourceItem[] = (data ?? []).map((r) => ({
    id: r.id as string,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    category: r.category as string,
    file_url: (r.file_url as string | null) ?? null,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.resources} />

      {items.length === 0 ? (
        <EmptyState icon={Library} title="Sem recursos por enquanto" />
      ) : (
        <ResourceBrowser resources={items} />
      )}
    </div>
  );
}
