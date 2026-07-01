import { notFound } from "next/navigation";
import Link from "next/link";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { RoleBadge } from "@/components/shared/role-badge";
import { EmptyState } from "@/components/shared/empty-state";
import { SocialLinks } from "@/components/shared/social-links";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { formatRelative } from "@/lib/utils";
import { getCategoryLabel } from "@/lib/community/structure";
import type { SocialLinks as SocialLinksMap } from "@/types/db";

type Params = Promise<{ userId: string }>;

function Stat({ label, value }: { label: string; value: number }) {
  return (
    <div className="rounded-lg border border-border bg-muted/30 p-3 text-center">
      <p className="text-xl font-semibold tabular-nums">{value}</p>
      <p className="text-xs text-muted-foreground">{label}</p>
    </div>
  );
}

export default async function MemberProfile({ params }: { params: Params }) {
  const { userId } = await params;
  await requireProfile();
  const supabase = await createClient();

  const { data: p } = await supabase.from("profiles").select("*").eq("id", userId).maybeSingle();
  if (!p) notFound();

  const [{ data: posts }, { count: postsCount }, { count: commentsCount }, { count: eventsCount }] =
    await Promise.all([
      supabase
        .from("posts")
        .select("id, title, body, created_at, category")
        .eq("author_id", userId)
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(5),
      supabase
        .from("posts")
        .select("id", { count: "exact", head: true })
        .eq("author_id", userId)
        .eq("is_deleted", false),
      supabase
        .from("post_comments")
        .select("id", { count: "exact", head: true })
        .eq("author_id", userId)
        .eq("is_deleted", false),
      supabase
        .from("event_attendees")
        .select("id", { count: "exact", head: true })
        .eq("user_id", userId)
        .eq("status", "going"),
    ]);

  const memberSince = p.created_at
    ? new Date(p.created_at as string).toLocaleDateString("pt-BR", { month: "long", year: "numeric" })
    : null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Card className="overflow-hidden">
        <div
          aria-hidden
          className="h-20 w-full"
          style={{ background: "radial-gradient(120% 100% at 0% 0%, var(--accent-glow), transparent 65%)" }}
        />
        <CardHeader className="-mt-12">
          <div className="flex flex-col gap-3 sm:flex-row sm:items-end">
            <UserAvatar
              name={p.full_name as string | null}
              src={p.avatar_url as string | null}
              className="h-20 w-20 ring-4 ring-background"
            />
            <div className="flex-1 space-y-1.5">
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-xl">{(p.full_name as string) ?? "Membro"}</CardTitle>
                {p.username ? (
                  <span className="text-sm text-muted-foreground">@{p.username as string}</span>
                ) : null}
              </div>
              <div className="flex flex-wrap items-center gap-2">
                <RoleBadge role={(p.role as string) ?? "member"} />
                <LevelBadge level={(p.level as number) ?? 1} />
                {p.is_owner ? (
                  <Badge variant="default" className="text-[10px]">
                    Owner
                  </Badge>
                ) : null}
                {memberSince ? (
                  <span className="text-xs text-muted-foreground">Membro desde {memberSince}</span>
                ) : null}
              </div>
              {p.bio ? (
                <p className="text-sm text-muted-foreground">{p.bio as string}</p>
              ) : (
                <p className="text-sm text-muted-foreground/70">Este membro ainda não escreveu uma bio.</p>
              )}
              <SocialLinks links={p.social_links as SocialLinksMap | undefined} className="pt-1" />
            </div>
          </div>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 gap-3 sm:grid-cols-5">
            <Stat label="Pontos" value={(p.points as number) ?? 0} />
            <Stat label="Nível" value={(p.level as number) ?? 1} />
            <Stat label="Publicações" value={postsCount ?? 0} />
            <Stat label="Comentários" value={commentsCount ?? 0} />
            <Stat label="Eventos" value={eventsCount ?? 0} />
          </div>
        </CardContent>
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
              {posts.map((post) => {
                return (
                  <li key={post.id as string}>
                    <Link href={`/community/${post.id}`} className="block py-3 hover:bg-accent">
                      <p className="text-xs text-muted-foreground">
                        {formatRelative(post.created_at as string)} · {getCategoryLabel(post.category as string)}
                      </p>
                      <p className="line-clamp-2 text-sm">
                        {(post.title as string) ?? (post.body as string)}
                      </p>
                    </Link>
                  </li>
                );
              })}
            </ul>
          )}
        </CardContent>
      </Card>
    </div>
  );
}
