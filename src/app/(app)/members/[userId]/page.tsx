import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { RoleBadge } from "@/components/shared/role-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";

type Params = Promise<{ userId: string }>;

export default async function MemberProfile({ params }: { params: Params }) {
  const { userId } = await params;
  await requireProfile();
  const supabase = await createClient();
  const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!p) notFound();

  const { data: posts } = await supabase
    .from("posts")
    .select("id, title, body, created_at, category")
    .eq("author_id", userId)
    .eq("is_deleted", false)
    .order("created_at", { ascending: false })
    .limit(5);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Card>
        <CardHeader>
          <div className="flex items-center gap-3">
            <UserAvatar
              name={p.full_name as string | null}
              src={p.avatar_url as string | null}
              className="h-16 w-16"
            />
            <div className="space-y-1">
              <CardTitle>{(p.full_name as string) ?? "Membro"}</CardTitle>
              <div className="flex items-center gap-2">
                <LevelBadge level={(p.level as number) ?? 1} />
                <RoleBadge role={(p.role as string) ?? "member"} />
                <Badge variant="secondary">{p.points as number} pontos</Badge>
              </div>
              {p.bio ? <p className="text-sm text-muted-foreground">{p.bio as string}</p> : null}
            </div>
          </div>
        </CardHeader>
      </Card>

      <Card>
        <CardHeader>
          <CardTitle className="text-base">Publicações recentes</CardTitle>
        </CardHeader>
        <CardContent>
          {!posts || posts.length === 0 ? (
            <EmptyState title="Sem publicações ainda" />
          ) : (
            <ul className="divide-y">
              {posts.map((post) => (
                <li key={post.id as string}>
                  <Link
                    href={`/community/${post.id}`}
                    className="block py-3 hover:bg-accent"
                  >
                    <p className="text-xs text-muted-foreground">
                      {formatRelative(post.created_at as string)} · {post.category as string}
                    </p>
                    <p className="line-clamp-2 text-sm">{(post.title as string) ?? (post.body as string)}</p>
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
