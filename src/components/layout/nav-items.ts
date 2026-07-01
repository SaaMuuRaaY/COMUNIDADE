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

export type NavGroup = "geral" | "aprender" | "participacao" | "conta";

export type NavItem = {
  href: string;
  label: string;
  icon: typeof Home;
  group: NavGroup;
};

export const NAV_ITEMS: NavItem[] = [
  { href: "/dashboard", label: "Início", icon: Home, group: "geral" },
  { href: "/community", label: "Comunidade", icon: MessageSquareText, group: "geral" },
  { href: "/courses", label: "Cursos", icon: GraduationCap, group: "aprender" },
  { href: "/resources", label: "Recursos", icon: Library, group: "aprender" },
  { href: "/apps", label: "Aplicativos", icon: LayoutGrid, group: "aprender" },
  { href: "/calendar", label: "Calendário", icon: Calendar, group: "participacao" },
  { href: "/leaderboard", label: "Ranking", icon: Trophy, group: "participacao" },
  { href: "/notifications", label: "Notificações", icon: Bell, group: "conta" },
  { href: "/profile", label: "Perfil", icon: User, group: "conta" },
];

// Rótulos por grupo — `Record<NavGroup, string>` força exaustividade no compilador:
// adicionar um valor a NavGroup sem rótulo aqui vira erro de tipo (evita item sumir da nav).
const NAV_GROUP_LABELS: Record<NavGroup, string> = {
  geral: "Geral",
  aprender: "Aprender e Construir",
  participacao: "Participação",
  conta: "Conta",
};

// Ordem de exibição = ordem de inserção das chaves acima (garantida p/ chaves string em JS).
export const NAV_GROUPS: { group: NavGroup; label: string }[] = (
  Object.keys(NAV_GROUP_LABELS) as NavGroup[]
).map((group) => ({ group, label: NAV_GROUP_LABELS[group] }));

export const ADMIN_ITEM = {
  href: "/admin",
  label: "Painel admin",
  icon: Wrench,
};

export const MOBILE_NAV: NavItem[] = NAV_ITEMS.filter((i) =>
  ["/dashboard", "/community", "/courses", "/resources", "/calendar"].includes(i.href),
);
