import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { requireActiveProfile } from "@/lib/auth/current-user";
import { isAdmin as isAdminCheck } from "@/lib/permissions/policies";
import { getUnreadDmCount } from "@/server/queries/direct-messages";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireActiveProfile();
  const admin = isAdminCheck(profile);
  const unreadDm = await getUnreadDmCount();

  return (
    <div className="flex min-h-screen">
      <Sidebar unreadDm={unreadDm} />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header profile={profile} isAdmin={admin} />
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
