import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { DeletePostInline } from "./delete-post-inline";

export const metadata = { title: "Posts · Admin" };

export default async function AdminPostsPage() {
  const supabase = await createClient();
  const { data } = await supabase
    .from("posts")
    .select("id, title, body, category, created_at, is_deleted, profiles:author_id(full_name)")
    .order("created_at", { ascending: false })
    .limit(100);
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Moderação de posts</h1>
      {items.length === 0 ? (
        <EmptyState title="Sem posts" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((p) => {
                const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                return (
                  <li key={p.id as string} className="flex items-start justify-between gap-3 p-4">
                    <div className="min-w-0 flex-1 space-y-1">
                      <div className="flex flex-wrap items-center gap-2">
                        <Badge variant="outline">{p.category as string}</Badge>
                        {p.is_deleted ? <Badge variant="destructive">Excluído</Badge> : null}
                        <span className="text-xs text-muted-foreground">
                          {author?.full_name ?? "Membro"} · {formatRelative(p.created_at as string)}
                        </span>
                      </div>
                      <p className="line-clamp-2 text-sm">{(p.title as string) ?? (p.body as string)}</p>
                    </div>
                    {!p.is_deleted ? <DeletePostInline postId={p.id as string} /> : null}
                  </li>
                );
              })}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
