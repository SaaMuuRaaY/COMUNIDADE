"use client";

import { useState } from "react";
import Link from "next/link";
import { Bell, Bookmark, LogOut, Menu, MessageCircle, Settings, User, Users, Wrench } from "lucide-react";
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
import { Logo } from "@/components/shared/logo";
import { UserAvatar } from "@/components/shared/user-avatar";
import { LevelBadge } from "@/components/shared/level-badge";
import { RoleBadge } from "@/components/shared/role-badge";
import { logoutAction } from "@/server/actions/auth";
import { ThemeSettings } from "@/components/nexus/theme-settings";
import { NavTree } from "./nav-tree";
import { HeaderPanel } from "./header-panel";
import { ConversationsPanel } from "@/components/direct/conversations-panel";
import { NotificationsPanel } from "@/components/notifications/notifications-panel";
import { RequestsPanel } from "@/components/connections/requests-panel";
import type { Profile } from "@/types/db";

export function Header({
  profile,
  isAdmin,
  unreadDm,
  unreadNotifications,
  pendingRequests,
}: {
  profile: Profile;
  isAdmin: boolean;
  unreadDm?: number;
  unreadNotifications?: number;
  pendingRequests?: number;
}) {
  const [drawerOpen, setDrawerOpen] = useState(false);
  const [themeOpen, setThemeOpen] = useState(false);

  return (
    <header className="sticky top-0 z-20 flex h-14 items-center gap-3 border-b bg-background/95 px-4 backdrop-blur md:px-6">
      <Sheet open={drawerOpen} onOpenChange={setDrawerOpen}>
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" className="md:hidden">
            <Menu className="h-5 w-5" />
            <span className="sr-only">Menu</span>
          </Button>
        </SheetTrigger>
        <SheetContent side="left" className="p-0">
          <div className="flex h-full flex-col p-4">
            <Link
              href="/dashboard"
              onClick={() => setDrawerOpen(false)}
              className="flex items-center px-2 py-3"
            >
              <Logo className="h-7 w-auto" />
            </Link>
            <Separator className="my-2" />
            <nav className="flex flex-1 flex-col gap-4 overflow-y-auto">
              <NavTree variant="drawer" onNavigate={() => setDrawerOpen(false)} />
            </nav>
          </div>
        </SheetContent>
      </Sheet>

      <Link href="/dashboard" className="flex items-center md:hidden">
        <Logo className="h-6 w-auto" />
      </Link>

      <div className="ml-auto flex items-center gap-3">
        <LevelBadge level={profile.level} />
        <RoleBadge role={profile.role} />

        <HeaderPanel
          icon={MessageCircle}
          label="Conversas"
          count={unreadDm}
          href="/mensagens"
          footerLabel="Ver todas as mensagens"
        >
          <ConversationsPanel />
        </HeaderPanel>

        <HeaderPanel
          icon={Bell}
          label="Notificações"
          count={unreadNotifications}
          href="/notifications"
          footerLabel="Ver todas as notificações"
        >
          <NotificationsPanel />
        </HeaderPanel>

        <HeaderPanel
          icon={Users}
          label="Conexões"
          count={pendingRequests}
          href="/conexoes"
          footerLabel="Ver conexões"
        >
          <RequestsPanel />
        </HeaderPanel>

        <Link href="/salvos" aria-label="Salvos">
          <Button variant="ghost" size="icon">
            <Bookmark className="h-5 w-5" />
          </Button>
        </Link>

        <DropdownMenu modal={false}>
          <DropdownMenuTrigger asChild>
            <button
              aria-label="Menu do usuário"
              className="flex items-center gap-2 rounded-full ring-offset-background focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2"
            >
              <UserAvatar name={profile.full_name} src={profile.avatar_url} />
            </button>
          </DropdownMenuTrigger>
          <DropdownMenuContent align="end" className="w-56">
            <DropdownMenuLabel className="font-normal">
              <div className="space-y-0.5">
                <p className="text-sm font-medium">{profile.full_name ?? "Membro"}</p>
                {profile.username ? (
                  <p className="text-xs text-muted-foreground">@{profile.username}</p>
                ) : null}
                <p className="text-xs text-muted-foreground">
                  {profile.points} pontos · Nv {profile.level}
                </p>
              </div>
            </DropdownMenuLabel>
            <DropdownMenuSeparator />
            <DropdownMenuItem asChild>
              <Link href="/profile" className="flex items-center gap-2">
                <User className="h-4 w-4" /> Meu perfil
              </Link>
            </DropdownMenuItem>
            <DropdownMenuItem
              className="flex items-center gap-2"
              onSelect={(e) => {
                e.preventDefault();
                setThemeOpen(true);
              }}
            >
              <Settings className="h-4 w-4" /> Configurações visuais
            </DropdownMenuItem>
            {isAdmin ? (
              <DropdownMenuItem asChild>
                <Link href="/admin" className="flex items-center gap-2">
                  <Wrench className="h-4 w-4" /> Painel administrativo
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

      {/* Drawer de aparência controlado pelo item "Configurações visuais" (sem trigger próprio). */}
      <ThemeSettings open={themeOpen} onOpenChange={setThemeOpen} hideTrigger />
    </header>
  );
}
