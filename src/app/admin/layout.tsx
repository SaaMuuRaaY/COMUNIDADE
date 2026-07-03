import Link from "next/link";
import { Sidebar } from "@/components/layout/sidebar";
import { Header } from "@/components/layout/header";
import { MobileNav } from "@/components/layout/mobile-nav";
import { requireAdmin } from "@/lib/auth/current-user";

const ADMIN_LINKS = [
  { href: "/admin", label: "Visão geral" },
  { href: "/admin/courses", label: "Cursos" },
  { href: "/admin/posts", label: "Posts" },
  { href: "/admin/resources", label: "Recursos" },
  { href: "/admin/apps", label: "Apps" },
  { href: "/admin/events", label: "Eventos" },
  { href: "/admin/members", label: "Membros" },
  { href: "/admin/reports", label: "Denúncias" },
  { href: "/admin/settings", label: "Configurações" },
];

export default async function AdminLayout({ children }: { children: React.ReactNode }) {
  const profile = await requireAdmin();

  return (
    <div className="flex min-h-screen">
      <Sidebar />
      <div className="flex min-h-screen flex-1 flex-col">
        <Header profile={profile} isAdmin />
        <div className="border-b bg-muted/30">
          <nav className="mx-auto flex max-w-6xl flex-wrap gap-3 px-4 py-3 text-sm md:px-6">
            {ADMIN_LINKS.map((l) => (
              <Link
                key={l.href}
                href={l.href}
                className="rounded-md px-3 py-1 text-muted-foreground hover:bg-accent hover:text-foreground"
              >
                {l.label}
              </Link>
            ))}
          </nav>
        </div>
        <main className="flex-1 pb-20 md:pb-6">{children}</main>
        <MobileNav />
      </div>
    </div>
  );
}
