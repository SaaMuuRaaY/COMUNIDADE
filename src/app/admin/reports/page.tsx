import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { getDmReports } from "@/server/queries/direct-messages";

export const metadata = { title: "Denúncias · Admin" };

export default async function AdminReportsPage() {
  const reports = await getDmReports();

  return (
    <div className="mx-auto max-w-5xl space-y-4 p-4 md:p-6">
      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">Denúncias de conversas</h1>
        <p className="text-sm text-muted-foreground">
          Mensagens diretas reportadas por membros. Abra para auditar o conteúdo.
        </p>
      </div>

      {reports.length === 0 ? (
        <EmptyState title="Nenhuma denúncia" description="Nada reportado até agora." />
      ) : (
        <Card>
          <CardContent className="p-0">
            <ul className="divide-y">
              {reports.map((r) => (
                <li key={r.id} className="flex items-start gap-3 p-4">
                  <UserAvatar
                    name={r.reporter?.full_name}
                    src={r.reporter?.avatar_url}
                    className="h-9 w-9 shrink-0"
                  />
                  <div className="min-w-0 flex-1 space-y-1">
                    <p className="text-sm">
                      <span className="font-medium">{r.reporter?.full_name ?? "Membro"}</span> denunciou a
                      conversa entre{" "}
                      <span className="font-medium">
                        {r.participants.map((p) => p.full_name ?? "Membro").join(" e ")}
                      </span>
                    </p>
                    <p className="text-sm text-muted-foreground">“{r.reason}”</p>
                    <div className="flex items-center gap-3 text-xs text-muted-foreground">
                      <span>
                        {new Date(r.created_at).toLocaleString("pt-BR", {
                          dateStyle: "short",
                          timeStyle: "short",
                        })}
                      </span>
                      <Link
                        href={`/admin/reports/${r.conversation_id}`}
                        className="font-medium text-[var(--accent)] hover:underline"
                      >
                        Ver conversa
                      </Link>
                    </div>
                  </div>
                </li>
              ))}
            </ul>
          </CardContent>
        </Card>
      )}
    </div>
  );
}
