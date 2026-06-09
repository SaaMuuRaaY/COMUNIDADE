"use client";

import Link from "next/link";
import { Bell, Hexagon, LogOut, Menu, User } from "lucide-react";
import {
  DropdownMenu,
  DropdownMenuContent,
  DropdownMenuItem,
  DropdownMenuLabel,
  DropdownMenuSeparator,
  DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { Separator } from "@/components/ui/separator";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { RoleBadge } from "@/components/shared/role-badge";
import { logoutAction } from "@/server/actions/auth";
import { NAV_ITEMS, ADMIN_ITEM } from "./nav-items";
import type { Profile } from "@/types/db";

export function Header({ profile, isAdmin }: { profile: Profile; isAdmin: boolean }) {
  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Sheet>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <div className="flex h-full flex-col p-4">
            <Link href="/dashboard" className="flex items-center gap-2 px-2 py-3 text-lg font-semibold">
              <Hexagon className="h-6 w-6" />
              CODEX
            </Link>
            <Separator className="my-2" />
            <nav className="flex flex-1 flex-col gap-1">
              {NAV_ITEMS.map((i) => (
                <Link
                  key={i.href}
                  href={i.href}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <i.icon className="h-4 w-4" /> {i.label}
                </Link>
              ))}
              {isAdmin ? (
                <Link
                  href={ADMIN_ITEM.href}
                  className="flex items-center gap-3 rounded-md px-2 py-2 text-sm hover:bg-accent"
                >
                  <ADMIN_ITEM.icon className="h-4 w-4" /> {ADMIN_ITEM.label}
                </Link>
              ) : null}
            </nav>
            <form action={logoutAction}>
              <Button variant="ghost" className="w-full justify-start gap-2">
                <LogOut className="h-4 w-4" /> Sair
              </Button>
            </form>
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="flex items-center gap-2 md:hidden">
        <Hexagon className="h-5 w-5" />
        <span className="font-semibold">CODEX</span>
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <LevelBadge level={profile.level} />
        <RoleBadge role={profile.role} />

        <Link href="/notifications" aria-label="Notificações">
          <Button variant="ghost" size="icon">
            <Bell className="h-5 w-5" />
          </Button>
        </Link>

        <DropdownMenu>
          <DropdownMenuTrigger asChild>
            <button className="flex items-center gap-2 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2">
              <UserAvatar name={profile.full_name} src={profile.avatar_url} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{profile.full_name ?? "Membro"}</p>
                <p className="text-xs text-muted-foreground">{profile.points} pontos · Nv {profile.level}</p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Meu perfil
              </Link>
            </DropdownMenuItem>
            {isAdmin ? (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-2">
                  <ADMIN_ITEM.icon className="h-4 w-4" /> Painel admin
                </Link>
              </DropdownMenuItem>
            ) : null}
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <form action={logoutAction} className="w-full">
                <button type="submit" className="flex w-full items-center gap-2">
                  <LogOut className="h-4 w-4" /> Sair
                </button>
              </form>
            </DropdownMenuItem>
          </DropdownMenuContent>
        </DropdownMenu>
      </div>
    </header>
  );
}
