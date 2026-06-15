import {
  Calendar,
  GraduationCap,
  LayoutGrid,
  Library,
  MessageSquareText,
  Trophy,
  User,
  type LucideIcon,
} from "lucide-react";

/**
 * Config LOCAL dos banners por área (Fase 4A). Sem banco/admin — fonte única
 * para o cabeçalho contextual de cada seção. Para versão dinâmica (settings/admin)
 * no futuro, basta trocar a fonte mantendo o componente <SectionBanner>.
 */
export type SectionBannerConfig = {
  eyebrow?: string;
  title: string;
  description: string;
  icon?: LucideIcon;
  cta?: { label: string; href: string };
  variant?: "default" | "featured";
};

export const SECTION_BANNERS = {
  community: {
    icon: MessageSquareText,
    eyebrow: "Comunidade",
    title: "Comunidade",
    description: "Publique, comente e troque ideias com outros membros.",
    variant: "featured",
  },
  courses: {
    icon: GraduationCap,
    eyebrow: "Aprender",
    title: "Cursos",
    description: "Trilhas e aulas da comunidade. Conclua aulas para ganhar pontos e subir de nível.",
  },
  resources: {
    icon: Library,
    eyebrow: "Biblioteca",
    title: "Recursos",
    description: "PDFs, templates, planilhas, códigos e ferramentas curados para a comunidade.",
  },
  apps: {
    icon: LayoutGrid,
    eyebrow: "Ferramentas",
    title: "Aplicativos",
    description: "Ferramentas, integrações e apps internos reunidos num só lugar.",
  },
  calendar: {
    icon: Calendar,
    eyebrow: "Agenda",
    title: "Calendário",
    description: "Lives, mentorias, aulas e desafios. Confirme presença para ganhar pontos.",
  },
  leaderboard: {
    icon: Trophy,
    eyebrow: "Gamificação",
    title: "Ranking",
    description: "Os membros mais ativos da comunidade. Ganhe pontos publicando, comentando, concluindo aulas e participando de eventos.",
  },
  profile: {
    icon: User,
    eyebrow: "Sua conta",
    title: "Meu perfil",
    description: "Gerencie seu avatar, nome, username e bio.",
  },
} satisfies Record<string, SectionBannerConfig>;

export type SectionKey = keyof typeof SECTION_BANNERS;
