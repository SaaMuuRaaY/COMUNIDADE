/**
 * Camada visual dos ícones da navegação unificada (Fase 6.5): resolve um
 * identificador string (definido em src/lib/navigation.ts) para um componente
 * Lucide. Puro (RSC-safe e usável em client). Fallback seguro se o id não casar.
 *
 * Superset dos ícones de rota + canal + página. channel-icon.tsx permanece
 * independente para os internos da Comunidade (post-card/composer).
 */
import {
  Home,
  MessageSquareText,
  GraduationCap,
  Library,
  LayoutGrid,
  Bot,
  Calendar,
  Trophy,
  Sparkles,
  Hand,
  Megaphone,
  Repeat,
  Radio,
  TrendingUp,
  MessagesSquare,
  Briefcase,
  Handshake,
  Rocket,
  HelpCircle,
  Ticket,
  LifeBuoy,
  Lightbulb,
  BadgeDollarSign,
  FolderKanban,
  Gift,
  Info,
  Flag,
  Mail,
} from "lucide-react";

type IconComp = typeof MessageSquareText;

const ICONS: Record<string, IconComp> = {
  home: Home,
  "message-square-text": MessageSquareText,
  "graduation-cap": GraduationCap,
  library: Library,
  "layout-grid": LayoutGrid,
  bot: Bot,
  calendar: Calendar,
  trophy: Trophy,
  sparkles: Sparkles,
  hand: Hand,
  megaphone: Megaphone,
  repeat: Repeat,
  radio: Radio,
  "trending-up": TrendingUp,
  "messages-square": MessagesSquare,
  briefcase: Briefcase,
  handshake: Handshake,
  rocket: Rocket,
  "help-circle": HelpCircle,
  ticket: Ticket,
  "life-buoy": LifeBuoy,
  lightbulb: Lightbulb,
  "badge-dollar-sign": BadgeDollarSign,
  "folder-kanban": FolderKanban,
  gift: Gift,
  info: Info,
  flag: Flag,
  mail: Mail,
};

export function NavIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? MessageSquareText;
  return <Icon className={className} />;
}
