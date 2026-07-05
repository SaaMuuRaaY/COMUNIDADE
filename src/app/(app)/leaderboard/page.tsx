import Link from "next/link";
import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getMonthlyRanking } from "@/server/queries/rewards";
import { cn } from "@/lib/utils";

export const metadata = { title: "Ranking" };

type Row = {
  id: string;
  full_name: string | null;
  avatar_url: string | null;
  level: number;
  points: number;
};

export default async function LeaderboardPage({
  searchParams,
}: {
  searchParams: Promise<{ period?: string }>;
}) {
  const me = await requireProfile();
  const period = (await searchParams).period === "month" ? "month" : "all";

  let rows: Row[] = [];
  if (period === "month") {
    const data = await getMonthlyRanking(50);
    rows = data.map((r) => ({
      id: r.user_id,
      full_name: r.full_name,
      avatar_url: r.avatar_url,
      level: r.level,
      points: r.monthly_points,
    }));
  } else {
    const supabase = await createClient();
    const { data } = await supabase
      .from("profiles")
      .select("id, full_name, avatar_url, points, level")
      .eq("is_banned", false)
      .order("points", { ascending: false })
      .limit(50);
    rows = (data ?? []).map((p) => ({
      id: p.id as string,
      full_name: (p.full_name as string | null) ?? null,
      avatar_url: (p.avatar_url as string | null) ?? null,
      level: (p.level as number) ?? 1,
      points: (p.points as number) ?? 0,
    }));
  }

  const myRank = rows.findIndex((r) => r.id === me.id);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.leaderboard}>
        {myRank >= 0
          ? `Você está em #${myRank + 1} de ${rows.length}${period === "month" ? " neste mês" : ""}.`
          : period === "month"
            ? "Você ainda não pontuou neste mês — participe para aparecer aqui."
            : "Você ainda não está no top 50 — participe para aparecer aqui."}
      </SectionBanner>

      <div className="flex gap-2">
        <PeriodTab href="/leaderboard" active={period === "all"}>
          Todos os tempos
        </PeriodTab>
        <PeriodTab href="/leaderboard?period=month" active={period === "month"}>
          Este mês
        </PeriodTab>
      </div>

      <Card>
        <CardContent className="p-0">
          {rows.length === 0 ? (
            <p className="p-6 text-center text-sm text-muted-foreground">
              Ninguém pontuou neste mês ainda. Publique, comente e participe para entrar no ranking.
            </p>
          ) : (
            <ul className="divide-y">
              {rows.map((p, i) => {
                const isMe = p.id === me.id;
                return (
                  <li
                    key={p.id}
                    className={cn(
                      "flex items-center gap-3 p-3",
                      isMe && "bg-[var(--accent-soft)] ring-1 ring-inset ring-[var(--accent-line)]",
                    )}
                  >
                    <div className="w-8 text-center text-sm font-semibold tabular-nums text-muted-foreground">
                      #{i + 1}
                    </div>
                    <UserAvatar name={p.full_name} src={p.avatar_url} className="h-9 w-9" />
                    <Link
                      href={`/members/${p.id}`}
                      className="min-w-0 flex-1 truncate font-medium hover:underline"
                    >
                      {p.full_name ?? "Membro"}
                    </Link>
                    <LevelBadge level={p.level} />
                    <Badge variant="secondary" className="tabular-nums">
                      {p.points} pts
                    </Badge>
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

function PeriodTab({
  href,
  active,
  children,
}: {
  href: string;
  active: boolean;
  children: React.ReactNode;
}) {
  return (
    <Link
      href={href}
      aria-current={active ? "page" : undefined}
      className={cn(
        "rounded-full border px-4 py-1.5 text-sm transition-colors",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
          : "border-border bg-background hover:bg-accent",
      )}
    >
      {children}
    </Link>
  );
}
