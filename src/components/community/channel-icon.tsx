/**
 * Camada visual dos ícones de canal/grupo: resolve um identificador string
 * (definido em src/lib/community/structure.ts) para um componente Lucide.
 * Componente puro (RSC-safe e usável em client). Fallback seguro se o id não casar.
 */
import {
  DoorOpen,
  UsersRound,
  Store,
  LifeBuoy,
  Shield,
  Sparkles,
  Hand,
  Megaphone,
  Radio,
  Rocket,
  MessagesSquare,
  Lightbulb,
  Briefcase,
  TrendingUp,
  Handshake,
  BadgeDollarSign,
  FolderKanban,
  HelpCircle,
  Gift,
  Ticket,
  Repeat,
  MessageSquareText,
} from "lucide-react";

type IconComp = typeof MessageSquareText;

const ICONS: Record<string, IconComp> = {
  "door-open": DoorOpen,
  "users-round": UsersRound,
  store: Store,
  "life-buoy": LifeBuoy,
  shield: Shield,
  sparkles: Sparkles,
  hand: Hand,
  megaphone: Megaphone,
  radio: Radio,
  rocket: Rocket,
  "messages-square": MessagesSquare,
  lightbulb: Lightbulb,
  briefcase: Briefcase,
  "trending-up": TrendingUp,
  handshake: Handshake,
  "badge-dollar-sign": BadgeDollarSign,
  "folder-kanban": FolderKanban,
  "help-circle": HelpCircle,
  gift: Gift,
  ticket: Ticket,
  repeat: Repeat,
};

export function ChannelIcon({ id, className }: { id: string; className?: string }) {
  const Icon = ICONS[id] ?? MessageSquareText;
  return <Icon className={className} />;
}
