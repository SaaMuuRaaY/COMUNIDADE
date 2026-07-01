/**
 * Estrutura da Comunidade — GRUPOS + CANAIS (modelagem estática no código).
 *
 * SERVER-SAFE / PURA: sem componentes React, sem "use client", sem imports de UI.
 * `icon` é um identificador string; a camada visual (channel-icon.tsx) resolve o
 * componente. Usável em RSC, Server Actions, schemas e queries.
 *
 * Fonte de verdade da arquitetura da informação: docs/COMMUNITY_INFORMATION_ARCHITECTURE.md.
 * Durante a transição (Fases 3–4) os slugs ANTIGOS de categoria ainda são aceitos
 * (ver LEGACY_*); o CHECK final e o remap de dados fecham na Fase 5.
 */

export type ChannelType = "discussion" | "announcement";
export type PublishRole = "member" | "moderator" | "admin";

export type ChannelGroup = {
  slug: string;
  label: string;
  order: number;
  icon: string;
};

export type Channel = {
  slug: string;
  label: string;
  groupSlug: string;
  order: number;
  icon: string;
  description: string;
  type: ChannelType;
  publish: PublishRole;
  comments: boolean;
  isOfficial: boolean;
};

export const CHANNEL_GROUPS: ChannelGroup[] = [
  { slug: "boas-vindas", label: "Boas-vindas", order: 1, icon: "door-open" },
  { slug: "networking", label: "Networking", order: 2, icon: "users-round" },
  { slug: "mercado-negocios", label: "Mercado e Negócios", order: 3, icon: "store" },
  { slug: "suporte-construcao", label: "Suporte e Construção", order: 4, icon: "life-buoy" },
  { slug: "portal-nexus", label: "Portal Nexus", order: 5, icon: "shield" },
];

export const CHANNELS: Channel[] = [
  // Boas-vindas
  { slug: "comece-por-aqui", label: "Comece por aqui", groupSlug: "boas-vindas", order: 1, icon: "sparkles", description: "Onboarding e primeiros passos.", type: "announcement", publish: "admin", comments: false, isOfficial: true },
  { slug: "apresente-se", label: "Apresente-se", groupSlug: "boas-vindas", order: 2, icon: "hand", description: "Novos membros se apresentam.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "comunicados", label: "Comunicados", groupSlug: "boas-vindas", order: 3, icon: "megaphone", description: "Anúncios oficiais da comunidade.", type: "announcement", publish: "moderator", comments: true, isOfficial: true },
  { slug: "lives-encontros", label: "Lives e encontros", groupSlug: "boas-vindas", order: 4, icon: "radio", description: "Lives e encontros da comunidade.", type: "announcement", publish: "moderator", comments: true, isOfficial: true },
  // Networking
  { slug: "compartilhe-seu-projeto", label: "Compartilhe seu projeto", groupSlug: "networking", order: 1, icon: "rocket", description: "Mostre o que está construindo.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "chat-networking", label: "Chat e networking", groupSlug: "networking", order: 2, icon: "messages-square", description: "Conversa geral e conexões.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "dicas-novidades", label: "Dicas e novidades", groupSlug: "networking", order: 3, icon: "lightbulb", description: "Dicas, links e novidades.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "vagas-oportunidades", label: "Vagas e oportunidades", groupSlug: "networking", order: 4, icon: "briefcase", description: "Vagas e oportunidades.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  // Mercado e Negócios
  { slug: "marketing-vendas", label: "Marketing e vendas", groupSlug: "mercado-negocios", order: 1, icon: "trending-up", description: "Marketing, vendas e aquisição.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "parcerias-colaboracoes", label: "Parcerias e colaborações", groupSlug: "mercado-negocios", order: 2, icon: "handshake", description: "Busca de parcerias.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "servicos-oportunidades", label: "Serviços e oportunidades", groupSlug: "mercado-negocios", order: 3, icon: "badge-dollar-sign", description: "Ofertas de serviços.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "projetos-negocios", label: "Projetos e negócios", groupSlug: "mercado-negocios", order: 4, icon: "folder-kanban", description: "Projetos e negócios.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  // Suporte e Construção
  { slug: "duvidas-gerais", label: "Dúvidas gerais", groupSlug: "suporte-construcao", order: 1, icon: "help-circle", description: "Perguntas e suporte da comunidade.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  // Portal Nexus
  { slug: "beneficios", label: "Benefícios", groupSlug: "portal-nexus", order: 1, icon: "gift", description: "Benefícios do Portal Nexus.", type: "announcement", publish: "admin", comments: false, isOfficial: true },
  { slug: "cupons-descontos", label: "Cupons e descontos", groupSlug: "portal-nexus", order: 2, icon: "ticket", description: "Cupons e descontos.", type: "announcement", publish: "admin", comments: false, isOfficial: true },
];

/** Canal padrão para /community e fallbacks. */
export const DEFAULT_CHANNEL_SLUG = "comece-por-aqui";

/** Slugs de categoria ANTIGOS (transição — removidos no CHECK final da Fase 5). */
export const LEGACY_CATEGORIES = [
  "geral", "duvidas", "apresentacoes", "resultados", "projetos", "avisos", "suporte",
] as const;

const LEGACY_CATEGORY_LABELS: Record<string, string> = {
  geral: "Geral",
  duvidas: "Dúvidas",
  apresentacoes: "Apresentações",
  resultados: "Resultados",
  projetos: "Projetos",
  avisos: "Avisos",
  suporte: "Suporte",
};

/** Mapa categoria-antiga → canal-novo (para redirect de ?category= e remap da Fase 5). */
export const LEGACY_CATEGORY_TO_CHANNEL: Record<string, string> = {
  geral: "chat-networking",
  duvidas: "duvidas-gerais",
  apresentacoes: "apresente-se",
  resultados: "compartilhe-seu-projeto",
  projetos: "projetos-negocios",
  avisos: "comunicados",
  suporte: "duvidas-gerais",
};

export function getChannel(slug: string): Channel | undefined {
  return CHANNELS.find((c) => c.slug === slug);
}

export function isKnownChannelSlug(slug: string): boolean {
  return CHANNELS.some((c) => c.slug === slug);
}

/** Aceita canais novos OU categorias antigas (validação TRANSITÓRIA — Fases 3–4). */
export function isValidPostCategory(slug: string): boolean {
  return isKnownChannelSlug(slug) || (LEGACY_CATEGORIES as readonly string[]).includes(slug);
}

/** Rótulo de exibição para um slug (canal novo, categoria antiga, ou o próprio slug). */
export function getCategoryLabel(slug: string): string {
  return getChannel(slug)?.label ?? LEGACY_CATEGORY_LABELS[slug] ?? slug;
}

/** Grupos ordenados, cada um com seus canais ordenados. */
export function listGroupsWithChannels(): { group: ChannelGroup; channels: Channel[] }[] {
  return [...CHANNEL_GROUPS]
    .sort((a, b) => a.order - b.order)
    .map((group) => ({
      group,
      channels: CHANNELS.filter((c) => c.groupSlug === group.slug).sort((a, b) => a.order - b.order),
    }));
}

type ProfileLike = { role: string; is_banned: boolean } | null;

/** Se o perfil pode PUBLICAR no canal (papel satisfaz `publish` e não banido). */
export function canPostInChannel(profile: ProfileLike, slug: string): boolean {
  const ch = getChannel(slug);
  if (!ch || !profile || profile.is_banned) return false;
  const role = profile.role;
  if (ch.publish === "member") return true;
  if (ch.publish === "moderator") return role === "moderator" || role === "admin";
  return role === "admin"; // publish === "admin"
}

/** Se o canal aceita comentários. */
export function canCommentInChannel(slug: string): boolean {
  return getChannel(slug)?.comments ?? true;
}
