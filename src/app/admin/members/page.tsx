import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { createClient } from "@/lib/supabase/server";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { canManageMember } from "@/lib/permissions/policies";
import { MemberRow } from "./member-row";

export const metadata = { title: "Membros · Admin" };

export default async function AdminMembersPage() {
  const supabase = await createClient();
  const me = await getCurrentProfile();
  const { data } = await supabase
    .from("profiles")
    .select("id, full_name, username, avatar_url, role, points, level, is_banned, is_owner, created_at")
    .order("created_at", { ascending: false });
  const items = data ?? [];

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Membros</h1>
      {items.length === 0 ? (
        <EmptyState title="Nenhum membro" />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {items.map((m) => (
                <li key={m.id as string} className="flex items-center gap-3 p-3">
                  <UserAvatar
                    name={m.full_name as string | null}
                    src={m.avatar_url as string | null}
                    className="h-9 w-9"
                  />
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 font-medium">
                      <Link
                        href={`/members/${m.id as string}`}
                        className="truncate hover:text-[var(--accent)] hover:underline"
                      >
                        {(m.full_name as string) ?? "Membro"}
                      </Link>
                      <span className="shrink-0 text-xs text-muted-foreground">
                        @{(m.username as string) ?? "—"}
                      </span>
                      {m.is_owner ? (
                        <Badge variant="default" className="shrink-0 text-[10px]">
                          Owner
                        </Badge>
                      ) : null}
                    </div>
                    <p className="text-xs text-muted-foreground">
                      {m.points as number} pts · Nv {m.level as number}
                      {m.is_banned ? " · BANIDO" : ""}
                    </p>
                  </div>
                  <MemberRow
                    id={m.id as string}
                    role={m.role as "admin" | "moderator" | "member"}
                    isBanned={m.is_banned as boolean}
                    isOwner={m.is_owner as boolean}
                    canManage={canManageMember(me, {
                      role: m.role as "admin" | "moderator" | "member",
                      is_owner: m.is_owner as boolean,
                    })}
                  />
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
