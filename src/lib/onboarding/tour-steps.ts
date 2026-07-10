/**
 * Passos do tour guiado dos MÓDULOS (não dos canais — um tour por canal seria
 * longo e cansativo). `target` casa com `data-tour` nos itens da NAV_TREE
 * (src/lib/navigation.ts). Item ausente para o papel do usuário é ignorado.
 *
 * Config estática e tipada: nada de editor visual nem texto no Admin.
 */
export type TourStep = {
  target: string;
  title: string;
  description: string;
};

export const TOUR_STEPS: readonly TourStep[] = [
  {
    target: "community",
    title: "Comunidade",
    description: "Acompanhe publicações, discussões e conteúdos em destaque.",
  },
  {
    target: "chat-network",
    title: "Chat Network",
    description: "Converse em tempo real com outros membros da comunidade.",
  },
  {
    target: "courses",
    title: "Cursos e Materiais",
    description: "Acesse cursos, aulas e conteúdos estruturados.",
  },
  {
    target: "resources",
    title: "Biblioteca",
    description: "Encontre recursos, templates, documentos e materiais práticos.",
  },
  {
    target: "apps",
    title: "Aplicativos",
    description: "Conheça ferramentas e aplicativos recomendados.",
  },
  {
    target: "agentes",
    title: "Agentes Especialistas",
    description: "Utilize agentes preparados para atividades específicas.",
  },
  {
    target: "calendar",
    title: "Calendário de Eventos",
    description: "Veja os próximos eventos e confirme sua presença.",
  },
  {
    target: "leaderboard",
    title: "Ranking",
    description: "Acompanhe seus pontos e sua participação na comunidade.",
  },
] as const;
