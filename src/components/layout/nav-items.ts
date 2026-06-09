import {
  Calendar,
  GraduationCap,
  Home,
  LayoutGrid,
  Library,
  MessageSquareText,
  Trophy,
  User,
  Wrench,
  Bell,
} from "lucide-react";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  group: "primary" | "secondary";
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home, group: "primary" },
  { href: "/community", label: "Comunidade", icon: MessageSquareText, group: "primary" },
  { href: "/courses", label: "Cursos", icon: GraduationCap, group: "primary" },
  { href: "/resources", label: "Recursos", icon: Library, group: "primary" },
  { href: "/apps", label: "Aplicativos", icon: LayoutGrid, group: "primary" },
  { href: "/calendar", label: "Calendário", icon: Calendar, group: "primary" },
  { href: "/leaderboard", label: "Ranking", icon: Trophy, group: "secondary" },
  { href: "/notifications", label: "Notificações", icon: Bell, group: "secondary" },
  { href: "/profile", label: "Perfil", icon: User, group: "secondary" },
];

export const ADMIN_ITEM = {
  href: "/admin",
  label: "Painel admin",
  icon: Wrench,
};

export const MOBILE_NAV: NavItem[] = NAV_ITEMS.filter((i) =>
  ["/dashboard", "/community", "/courses", "/resources", "/calendar"].includes(i.href),
);
