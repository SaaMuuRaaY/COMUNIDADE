import "server-only";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;

export type ResourceDetail = {
  id: string;
  slug: string | null;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  file_type: string | null;
  cover_url: string | null;
  click_count: number;
};

export type AppDetail = {
  id: string;
  slug: string | null;
  name: string;
  description: string | null;
  category: string;
  type: string;
  status: string;
  url: string | null;
  embed_url: string | null;
  file_url: string | null;
  icon_url: string | null;
  cover_url: string | null;
  click_count: number;
};

const RESOURCE_COLS = "id, slug, title, description, category, file_url, file_type, cover_url, click_count";
const APP_COLS =
  "id, slug, name, description, category, type, status, url, embed_url, file_url, icon_url, cover_url, click_count";

// Resolve por slug; se não achar e o param for um UUID, tenta por id (link antigo).
export async function getResourceBySlug(param: string): Promise<ResourceDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("resources").select(RESOURCE_COLS).eq("slug", param).maybeSingle();
  if (data) return data as ResourceDetail;
  if (UUID.test(param)) {
    const { data: byId } = await supabase.from("resources").select(RESOURCE_COLS).eq("id", param).maybeSingle();
    return (byId as ResourceDetail | null) ?? null;
  }
  return null;
}

export async function getAppBySlug(param: string): Promise<AppDetail | null> {
  const supabase = await createClient();
  const { data } = await supabase.from("apps").select(APP_COLS).eq("slug", param).maybeSingle();
  if (data) return data as AppDetail;
  if (UUID.test(param)) {
    const { data: byId } = await supabase.from("apps").select(APP_COLS).eq("id", param).maybeSingle();
    return (byId as AppDetail | null) ?? null;
  }
  return null;
}

// ---------------------------------------------------------------------------
// Preview PUBLICO (deslogado). Via service-role (a RLS e "to authenticated"),
// expondo SO o teaser (capa/titulo/categoria/trecho + contador). NUNCA retorna
// o payload (file_url/url/embed_url) — o conteudo completo fica pra quem loga.
// ---------------------------------------------------------------------------
export type LibraryPreview = {
  kind: "resource" | "app";
  slug: string | null;
  title: string;
  category: string;
  cover_url: string | null;
  teaser: string | null;
  click_count: number;
};

function teaserOf(description: string | null): string | null {
  if (!description) return null;
  const plain = description
    .replace(/[#*_`>[\]()]/g, "")
    .replace(/\s+/g, " ")
    .trim();
  return plain.length > 220 ? `${plain.slice(0, 220).trimEnd()}…` : plain;
}

export async function getPublicPreview(
  kind: "resource" | "app",
  param: string,
): Promise<LibraryPreview | null> {
  const supabase = createAdminClient();

  if (kind === "resource") {
    const cols = "slug, title, category, cover_url, click_count, description";
    let { data } = await supabase.from("resources").select(cols).eq("slug", param).maybeSingle();
    if (!data && UUID.test(param)) {
      ({ data } = await supabase.from("resources").select(cols).eq("id", param).maybeSingle());
    }
    if (!data) return null;
    return {
      kind,
      slug: data.slug,
      title: data.title,
      category: data.category,
      cover_url: data.cover_url,
      click_count: data.click_count,
      teaser: teaserOf(data.description),
    };
  }

  const cols = "slug, name, category, cover_url, click_count, description";
  let { data } = await supabase.from("apps").select(cols).eq("slug", param).maybeSingle();
  if (!data && UUID.test(param)) {
    ({ data } = await supabase.from("apps").select(cols).eq("id", param).maybeSingle());
  }
  if (!data) return null;
  return {
    kind,
    slug: data.slug,
    title: data.name,
    category: data.category,
    cover_url: data.cover_url,
    click_count: data.click_count,
    teaser: teaserOf(data.description),
  };
}
