import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { NavDrawerProvider } from "@/components/layout/nav-drawer-context";
import { requireActiveProfile } from "@/lib/auth/current-user";
import { isAdmin as isAdminCheck } from "@/lib/permissions/policies";
import { getUnreadDmCount } from "@/server/queries/direct-messages";
import { getUnreadNotificationCount } from "@/server/queries/notifications";
import { getPendingRequestCount } from "@/server/queries/connections";

export default async function AppLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireActiveProfile();
  const admin = isAdminCheck(profile);
  const [unreadDm, unreadNotifications, pendingRequests] = await Promise.all([
    getUnreadDmCount(),
    getUnreadNotificationCount(),
    getPendingRequestCount(),
  ]);

  return (
    // Provider client só do booleano do drawer (o tour precisa abri-lo no mobile).
    // `children` continua Server Component — passa como prop, sem virar client.
    <NavDrawerProvider>
      <div className="flex min-h-screen">
        <Sidebar unreadDm={unreadDm} />
        <div className="flex min-h-screen flex-1 flex-col">
          <Header
            profile={profile}
            isAdmin={admin}
            unreadDm={unreadDm}
            unreadNotifications={unreadNotifications}
            pendingRequests={pendingRequests}
          />
          <main className="flex-1 pb-20 md:pb-6">{children}</main>
          <MobileNav />
        </div>
      </div>
    </NavDrawerProvider>
  );
}
