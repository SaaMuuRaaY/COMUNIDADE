import { Mail } from "lucide-react";
import { SectionBanner } from "@/components/shared/section-banner";
import { ConversationList } from "@/components/direct/conversation-list";
import { NewConversation } from "@/components/direct/new-conversation";
import { getConversations } from "@/server/queries/direct-messages";

export const metadata = { title: "Mensagens · Comunidade" };

// FEATURE 03 — inbox de Direct Messages (conversas privadas 1:1).
export default async function MensagensPage() {
  const conversations = await getConversations();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner
        icon={Mail}
        eyebrow="Direct"
        title="Mensagens"
        description="Suas conversas privadas com outros membros da comunidade."
        variant="featured"
      />
      <div className="flex justify-end">
        <NewConversation />
      </div>
      <ConversationList conversations={conversations} />
    </div>
  );
}
