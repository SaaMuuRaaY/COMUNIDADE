import Link from "next/link";
import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";

export const metadata = { title: "Ranking" };

export default async function LeaderboardPage() {
  const me = await requireProfile();
  const supabase = await createClient();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, avatar_url, points, level, role")
    .order("points", { ascending: false })
    .limit(50);

  const rows = data ?? [];
  const myRank = rows.findIndex((r) => r.id === me.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.leaderboard}>
        {myRank >= 0
          ? `Você está em #${myRank + 1} de ${rows.length}.`
          : "Você ainda não está no top 50 — participe para aparecer aqui."}
      </SectionBanner>

      <Card>
        <CardContent className="p-0">
          <ul className="divide-y">
            {rows.map((p, i) => {
              const isMe = p.id === me.id;
              return (
                <li
                  key={p.id as string}
                  className={`flex items-center gap-3 p-3 ${isMe ? "bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent-line)]" : ""}`}
                >
                  <div className="w-8 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                    #{i + 1}
                  </div>
                  <UserAvatar
                    name={p.full_name as string | null}
                    src={p.avatar_url as string | null}
                    className="h-9 w-9"
                  />
                  <Link
                    href={`/members/${p.id}`}
                    className="min-w-0 flex-1 truncate font-medium hover:underline"
                  >
                    {(p.full_name as string) ?? "Membro"}
                  </Link>
                  <LevelBadge level={(p.level as number) ?? 1} />
                  <Badge variant="secondary" className="tabular-nums">
                    {p.points as number} pts
                  </Badge>
                </li>
              );
            })}
          </ul>
        </CardContent>
      </Card>
    </div>
  );
}
