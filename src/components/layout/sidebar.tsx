"use client";

import Link from "next/link";
import { Logo } from "@/components/shared/logo";
import { Separator } from "@/components/ui/separator";
import { NavTree } from "./nav-tree";

export function Sidebar() {
  return (
    <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-2 self-start overflow-y-auto border-r bg-sidebar px-3 py-4 text-sidebar-foreground md:flex">
      <Link href="/dashboard" className="flex items-center px-3 py-2">
        <Logo className="h-7 w-auto" priority />
      </Link>
      <Separator className="my-2 bg-sidebar-border" />
      <nav className="flex flex-1 flex-col gap-4">
        <NavTree variant="sidebar" />
      </nav>
    </aside>
  );
}
