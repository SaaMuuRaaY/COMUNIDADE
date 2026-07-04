import { Users } from "lucide-react";
import { SectionBanner } from "@/components/shared/section-banner";
import { ConnectionsTabs } from "@/components/connections/connections-tabs";
import { requireActiveProfile } from "@/lib/auth/current-user";
import {
  getFollowing,
  getFollowers,
  getFriends,
  getPendingRequests,
} from "@/server/queries/connections";

export const metadata = { title: "Conexões · Comunidade" };

// FEATURE 04 Fase 4 — rede do usuário (amigos, solicitações, seguindo, seguidores).
export default async function ConexoesPage() {
  const me = await requireActiveProfile();
  const [following, followers, friends, requests] = await Promise.all([
    getFollowing(me.id),
    getFollowers(me.id),
    getFriends(me.id),
    getPendingRequests(),
  ]);

  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <SectionBanner
        icon={Users}
        eyebrow="Rede"
        title="Conexões"
        description="Seus amigos, solicitações e quem você segue."
        variant="featured"
      />
      <ConnectionsTabs following={following} followers={followers} friends={friends} requests={requests} />
    </div>
  );
}
