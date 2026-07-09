import { Library } from "lucide-react";
import { EmptyState } from "@/components/shared/empty-state";
import { requireProfile } from "@/lib/auth/current-user";
import { isAdmin as isAdminCheck } from "@/lib/permissions/policies";
import { createClient } from "@/lib/supabase/server";
import { ResourceBrowser, type ResourceItem } from "@/components/resources/resource-browser";
import { CreateResourceButton } from "@/app/admin/resources/resource-actions";
import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";

export const metadata = { title: "Recursos" };

export default async function ResourcesPage() {
  const profile = await requireProfile();
  const admin = isAdminCheck(profile);
  const supabase = await createClient();
  const { data } = await supabase
    .from("resources")
    .select("id, slug, title, description, category, file_url, file_type, video_url, cover_url, click_count")
    .order("created_at", { ascending: false });

  const items: ResourceItem[] = (data ?? []).map((r) => ({
    id: r.id as string,
    slug: (r.slug as string | null) ?? null,
    title: r.title as string,
    description: (r.description as string | null) ?? null,
    category: r.category as string,
    file_url: (r.file_url as string | null) ?? null,
    file_type: (r.file_type as string | null) ?? null,
    video_url: (r.video_url as string | null) ?? null,
    cover_url: (r.cover_url as string | null) ?? null,
    click_count: (r.click_count as number) ?? 0,
  }));

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.resources} />

      {admin ? (
        <div className="flex justify-end">
          <CreateResourceButton />
        </div>
      ) : null}

      {items.length === 0 ? (
        <EmptyState icon={Library} title="Sem recursos por enquanto" />
      ) : (
        <ResourceBrowser resources={items} admin={admin} />
      )}
    </div>
  );
}
