"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { LogOut } from "lucide-react";
import { Logo } from "@/components/shared/logo";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, NAV_GROUPS, ADMIN_ITEM } from "./nav-items";
import { logoutAction } from "@/server/actions/auth";

const groupHeaderClass =
  "px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/50";

function linkClass(active: boolean) {
  return cn(
    "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
    active
      ? "bg-[var(--accent-soft)] text-foreground font-medium ring-1 ring-inset ring-[var(--accent-line)]"
      : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
  );
}

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const isActive = (href: string) => pathname === href || pathname.startsWith(href + "/");

  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 self-start overflow-y-auto border-r bg-sidebar px-3 py-4 text-sidebar-foreground md:flex">
      <Link href="/dashboard" className="flex items-center px-3 py-2">
        <Logo className="h-7 w-auto" priority />
      </Link>
      <Separator className="my-2 bg-sidebar-border" />
      <nav className="flex flex-1 flex-col gap-4">
        {NAV_GROUPS.map((g) => {
          const items = NAV_ITEMS.filter((i) => i.group === g.group);
          if (items.length === 0) return null;
          return (
            <div key={g.group} className="flex flex-col gap-1">
              <p className={groupHeaderClass}>{g.label}</p>
              {items.map((item) => {
                const active = isActive(item.href);
                return (
                  <Link
                    key={item.href}
                    href={item.href}
                    aria-current={active ? "page" : undefined}
                    className={linkClass(active)}
                  >
                    <item.icon className="h-4 w-4" />
                    {item.label}
                  </Link>
                );
              })}
            </div>
          );
        })}
        {isAdmin ? (
          <div className="flex flex-col gap-1">
            <p className={groupHeaderClass}>Administração</p>
            <Link
              href={ADMIN_ITEM.href}
              aria-current={pathname.startsWith("/admin") ? "page" : undefined}
              className={linkClass(pathname.startsWith("/admin"))}
            >
              <ADMIN_ITEM.icon className="h-4 w-4" />
              {ADMIN_ITEM.label}
            </Link>
          </div>
        ) : null}
      </nav>
      <form action={logoutAction} className="px-1">
        <Button type="submit" variant="ghost" className="w-full justify-start gap-2 text-sm">
          <LogOut className="h-4 w-4" />
          Sair
        </Button>
      </form>
    </aside>
  );
}
