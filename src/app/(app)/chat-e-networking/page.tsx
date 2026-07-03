import { MessagesSquare } from "lucide-react";
import { SectionBanner } from "@/components/shared/section-banner";
import { ChatRoom } from "@/components/chat/chat-room";
import { requireProfile } from "@/lib/auth/current-user";
import { canModerate } from "@/lib/permissions/policies";
import { getRecentMessages } from "@/server/queries/chat";

export const metadata = { title: "Chat Network · Comunidade" };

// FEATURE 02 — a rota Chat Network deixou de ser feed e virou CHAT em tempo real.
export default async function ChatNetworkPage() {
  const profile = await requireProfile();
  const messages = await getRecentMessages("community", 50);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner
        icon={MessagesSquare}
        eyebrow="Networking"
        title="Chat Network"
        description="Conversa em tempo real da comunidade."
        variant="featured"
      />
      <ChatRoom
        initialMessages={messages}
        currentUserId={profile.id}
        canModerate={canModerate(profile)}
      />
    </div>
  );
}
