import { notFound } from "next/navigation";
import { DMThread } from "@/components/direct/dm-thread";
import { requireActiveProfile } from "@/lib/auth/current-user";
import { getConversationById, getConversationMessages } from "@/server/queries/direct-messages";

export const metadata = { title: "Conversa · Mensagens" };

// FEATURE 03 — thread de uma conversa (realtime). RLS garante participante-ou-admin;
// getConversationById retorna null (-> notFound) se a conversa não é acessível.
export default async function ConversationPage({
  params,
}: {
  params: Promise<{ conversationId: string }>;
}) {
  const { conversationId } = await params;
  const profile = await requireActiveProfile();

  const header = await getConversationById(conversationId);
  if (!header) notFound();

  const messages = await getConversationMessages(conversationId, 50);

  return (
    <div className="mx-auto max-w-3xl p-4 md:p-6">
      <DMThread
        conversationId={conversationId}
        currentUserId={profile.id}
        other={header.other}
        iBlocked={header.iBlocked}
        initialMessages={messages}
      />
    </div>
  );
}
