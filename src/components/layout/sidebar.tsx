"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { Hexagon, LogOut } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { cn } from "@/lib/utils";
import { NAV_ITEMS, ADMIN_ITEM } from "./nav-items";
import { logoutAction } from "@/server/actions/auth";

export function Sidebar({ isAdmin }: { isAdmin: boolean }) {
  const pathname = usePathname();
  const primary = NAV_ITEMS.filter((i) => i.group === "primary");
  const secondary = NAV_ITEMS.filter((i) => i.group === "secondary");

  return (
    <aside className="hidden h-screen w-64 shrink-0 flex-col gap-2 border-r bg-sidebar px-3 py-4 text-sidebar-foreground md:flex">
      <Link href="/dashboard" className="flex items-center gap-2 px-3 py-2 text-lg font-semibold">
        <Hexagon className="h-6 w-6" />
        CODEX
      </Link>
      <Separator className="my-2 bg-sidebar-border" />
      <nav className="flex flex-1 flex-col gap-1">
        {primary.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        <Separator className="my-2 bg-sidebar-border" />
        {secondary.map((item) => {
          const active = pathname === item.href || pathname.startsWith(item.href + "/");
          return (
            <Link
              key={item.href}
              href={item.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                active
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <item.icon className="h-4 w-4" />
              {item.label}
            </Link>
          );
        })}
        {isAdmin ? (
          <>
            <Separator className="my-2 bg-sidebar-border" />
            <Link
              href={ADMIN_ITEM.href}
              className={cn(
                "flex items-center gap-3 rounded-md px-3 py-2 text-sm transition-colors",
                pathname.startsWith("/admin")
                  ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
                  : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
              )}
            >
              <ADMIN_ITEM.icon className="h-4 w-4" />
              {ADMIN_ITEM.label}
            </Link>
          </>
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
