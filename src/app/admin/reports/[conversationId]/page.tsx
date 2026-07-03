import Link from "next/link";
import { ArrowLeft } from "lucide-react";
import { notFound } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { formatRelative } from "@/lib/utils";
import { getAdminConversation } from "@/server/queries/direct-messages";

export const metadata = { title: "Auditar conversa · Admin" };

// Auditoria read-only de uma conversa denunciada (admin). Mostra inclusive o
// conteudo de mensagens removidas (o texto segue no banco) — é o ponto da auditoria.
export default async function AdminConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const data = await getAdminConversation(conversationId);
  if (!data) notFound();

  const { messages, participants } = data;
  const nameOf = (id: string) => participants.find((p) => p.id === id)?.full_name ?? "Membro";
  const avatarOf = (id: string) => participants.find((p) => p.id === id)?.avatar_url ?? null;

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <Link
        href="/admin/reports"
        className="inline-flex items-center gap-1 text-sm text-muted-foreground hover:text-foreground"
      >
        <ArrowLeft className="h-4 w-4" /> Voltar às denúncias
      </Link>
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Auditar conversa</h1>
        <p className="text-sm text-muted-foreground">
          {participants.map((p) => p.full_name ?? "Membro").join(" e ")} · somente leitura
        </p>
      </div>

      <Card>
        <CardContent className="space-y-3 p-4">
          {messages.length === 0 ? (
            <p className="py-8 text-center text-sm text-muted-foreground">Sem mensagens.</p>
          ) : (
            messages.map((m) => (
              <div key={m.id} className="flex items-start gap-2.5">
                <UserAvatar name={nameOf(m.sender_id)} src={avatarOf(m.sender_id)} className="h-8 w-8 shrink-0" />
                <div className="min-w-0 flex-1">
                  <div className="flex items-baseline gap-2">
                    <span className="text-sm font-medium">{nameOf(m.sender_id)}</span>
                    <span className="text-xs text-muted-foreground">{formatRelative(m.created_at)}</span>
                    {m.edited_at && !m.is_deleted ? (
                      <span className="text-xs text-muted-foreground">(editada)</span>
                    ) : null}
                  </div>
                  {m.is_deleted ? (
                    <p className="whitespace-pre-wrap break-words text-sm text-muted-foreground">
                      {m.body} <span className="italic">(removida)</span>
                    </p>
                  ) : (
                    <p className="whitespace-pre-wrap break-words text-sm">{m.body}</p>
                  )}
                </div>
              </div>
            ))
          )}
        </CardContent>
      </Card>
    </div>
  );
}
