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
  // Canal NOVO (Fase 6.5) — aceita posts só após a migration 0016 (CHECK). Navegável/leitura antes disso.
  { slug: "rotinas", label: "Rotinas", groupSlug: "boas-vindas", order: 5, icon: "repeat", description: "Desafios, rituais e check-ins da comunidade.", type: "announcement", publish: "moderator", comments: true, isOfficial: true },
  // Networking
  { slug: "compartilhe-seu-projeto", label: "Compartilhe seu projeto", groupSlug: "networking", order: 1, icon: "rocket", description: "Mostre o que está construindo.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "chat-networking", label: "Chat Network", groupSlug: "networking", order: 2, icon: "messages-square", description: "Conversa geral e conexões.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "dicas-novidades", label: "Dicas e novidades", groupSlug: "networking", order: 3, icon: "lightbulb", description: "Dicas, links e novidades.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "vagas-oportunidades", label: "Vagas e oportunidades", groupSlug: "networking", order: 4, icon: "briefcase", description: "Vagas e oportunidades.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  // Mercado e Negócios
  { slug: "marketing-vendas", label: "Marketing e vendas", groupSlug: "mercado-negocios", order: 1, icon: "trending-up", description: "Marketing, vendas e aquisição.", type: "discussion", publish: "moderator", comments: true, isOfficial: false },
  { slug: "parcerias-colaboracoes", label: "Parcerias e colaborações", groupSlug: "mercado-negocios", order: 2, icon: "handshake", description: "Busca de parcerias.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "servicos-oportunidades", label: "Serviços e oportunidades", groupSlug: "mercado-negocios", order: 3, icon: "badge-dollar-sign", description: "Ofertas de serviços.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  { slug: "projetos-negocios", label: "Projetos e negócios", groupSlug: "mercado-negocios", order: 4, icon: "folder-kanban", description: "Projetos e negócios.", type: "discussion", publish: "member", comments: true, isOfficial: false },
  // Suporte e Construção
  { slug: "duvidas-gerais", label: "Dúvidas gerais", groupSlug: "suporte-construcao", order: 1, icon: "help-circle", description: "Perguntas e suporte da comunidade.", type: "discussion", publish: "moderator", comments: true, isOfficial: false },
  // Canal NOVO (Fase 6.5) — aceita posts só após a migration 0016 (CHECK). Navegável/leitura antes disso.
  { slug: "suporte-tecnico", label: "Suporte técnico", groupSlug: "suporte-construcao", order: 2, icon: "life-buoy", description: "Dúvidas técnicas, erros e configuração — ajuda entre membros e equipe.", type: "discussion", publish: "moderator", comments: true, isOfficial: false },
  // Portal Nexus
  { slug: "beneficios", label: "Benefícios", groupSlug: "portal-nexus", order: 1, icon: "gift", description: "Benefícios do Portal Nexus.", type: "announcement", publish: "admin", comments: false, isOfficial: true },
  { slug: "cupons-descontos", label: "Cupons e descontos", groupSlug: "portal-nexus", order: 2, icon: "ticket", description: "Cupons e descontos.", type: "announcement", publish: "admin", comments: false, isOfficial: true },
];

/** Canal padrão para /community e fallbacks. */
export const DEFAULT_CHANNEL_SLUG = "comece-por-aqui";

/**
 * Canais aguardando o CHECK do banco (migration 0016). Enquanto pendentes, ficam
 * navegáveis/leitura (composer oculto + Server Action nega). A 0016 foi APLICADA
 * e validada na cloud (2026-07-02) → lista esvaziada: rotinas e suporte-tecnico
 * estão liberados para publicação conforme suas permissões.
 */
export const PENDING_CHANNELS = [] as const;

/** Se o canal existe mas ainda não aceita posts (aguarda migration 0016). */
export function isChannelPending(slug: string): boolean {
  return (PENDING_CHANNELS as readonly string[]).includes(slug);
}

/**
 * Canais LEGADOS/DEPRECIADOS (Fase 6.5) — fora da arquitetura final da sidebar,
 * mas PRESERVADOS: continuam na config e no CHECK do banco, sem rota raiz própria
 * (posts visíveis no Feed Geral). NÃO aparecem em src/lib/navigation.ts.
 * Aguardam inventário de conteúdo; destinos PROVÁVEIS (ainda NÃO executados):
 *   - servicos-oportunidades → vagas-oportunidades
 *   - projetos-negocios      → compartilhe-seu-projeto
 *   - beneficios             → cupons-descontos ou página institucional
 *   - dicas-novidades        → decidir entre comunicados e chat-networking
 * Nenhum remap/migração de conteúdo nesta etapa.
 */
export const DEPRECATED_CHANNELS = [
  "servicos-oportunidades",
  "projetos-negocios",
  "beneficios",
  "dicas-novidades",
] as const;

/** Se o canal é legado/depreciado (oculto da nav, preservado no banco/URL). */
export function isChannelDeprecated(slug: string): boolean {
  return (DEPRECATED_CHANNELS as readonly string[]).includes(slug);
}

/**
 * URL canônica RAIZ de cada canal ATIVO (Fase 6.6). Cada unidade tem rota própria
 * na raiz (ex.: /comece-por-aqui), NÃO mais sob /community/c/. O PATH pode diferir
 * do slug de categoria (ex.: slug `lives-encontros` → path `/lives-e-encontros`).
 * Canais LEGADOS (DEPRECATED_CHANNELS) não têm rota raiz (undefined).
 */
export const CHANNEL_HREFS: Record<string, string> = {
  "comece-por-aqui": "/comece-por-aqui",
  "apresente-se": "/apresente-se",
  rotinas: "/rotinas",
  comunicados: "/comunicados",
  "lives-encontros": "/lives-e-encontros",
  "marketing-vendas": "/marketing-e-vendas",
  "chat-networking": "/chat-e-networking",
  "vagas-oportunidades": "/vagas-e-oportunidades",
  "parcerias-colaboracoes": "/parcerias-e-colaboracoes",
  "compartilhe-seu-projeto": "/compartilhe-seu-projeto",
  "duvidas-gerais": "/duvidas-gerais",
  "cupons-descontos": "/cupons-e-descontos",
  "suporte-tecnico": "/suporte-tecnico",
};

/** Path raiz canônico de um canal (undefined se legado/desconhecido). */
export function channelHref(slug: string): string | undefined {
  return CHANNEL_HREFS[slug];
}

/**
 * CTA/guidance contextual do composer por canal (F2 — gestão contextual).
 * Estático (não CMS). Canais sem entrada usam o texto padrão do PostComposer.
 */
export const CHANNEL_COMPOSER: Record<
  string,
  { actionLabel: string; placeholder?: string; guidance?: string }
> = {
  "comece-por-aqui": { actionLabel: "Criar orientação", guidance: "Onboarding e primeiros passos." },
  "apresente-se": { actionLabel: "Criar apresentação", placeholder: "Conte quem você é e o que faz…", guidance: "Novos membros se apresentam aqui." },
  rotinas: { actionLabel: "Criar rotina", guidance: "Desafios, rituais e check-ins da comunidade." },
  comunicados: { actionLabel: "Criar comunicado", guidance: "Anúncio oficial da comunidade." },
  "lives-encontros": { actionLabel: "Criar live ou encontro", guidance: "Avise sobre a live/encontro e deixe o link." },
  "marketing-vendas": { actionLabel: "Criar publicação", guidance: "Marketing, vendas e aquisição." },
  "chat-networking": { actionLabel: "Criar publicação", placeholder: "O que está acontecendo?…" },
  "vagas-oportunidades": { actionLabel: "Publicar vaga ou oportunidade", placeholder: "Descreva a vaga ou oportunidade…", guidance: "Compartilhe vagas e oportunidades." },
  "parcerias-colaboracoes": { actionLabel: "Propor parceria", placeholder: "O que você busca ou oferece?…", guidance: "Busca por parcerias e colaborações." },
  "compartilhe-seu-projeto": { actionLabel: "Compartilhar projeto", placeholder: "Mostre o que está construindo…", guidance: "Compartilhe seu projeto e peça feedback." },
  "duvidas-gerais": { actionLabel: "Criar tópico", guidance: "Perguntas e suporte da comunidade." },
  "cupons-descontos": { actionLabel: "Adicionar benefício", guidance: "Cupons e descontos do Portal Nexus." },
  "suporte-tecnico": { actionLabel: "Criar tópico de suporte", placeholder: "Descreva seu problema técnico…", guidance: "Dúvidas técnicas, erros e configuração." },
};

/** CTA/placeholder/guidance do composer para um canal (objeto vazio se não houver). */
export function getChannelComposer(slug: string): {
  actionLabel?: string;
  placeholder?: string;
  guidance?: string;
} {
  return CHANNEL_COMPOSER[slug] ?? {};
}

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
  if (isChannelPending(slug)) return false; // aguarda migration 0016
  const role = profile.role;
  if (ch.publish === "member") return true;
  if (ch.publish === "moderator") return role === "moderator" || role === "admin";
  return role === "admin"; // publish === "admin"
}

/** Se o canal aceita comentários. */
export function canCommentInChannel(slug: string): boolean {
  return getChannel(slug)?.comments ?? true;
}
