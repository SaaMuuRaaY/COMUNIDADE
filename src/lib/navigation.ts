/**
 * Navegação UNIFICADA do Portal Nexus (Fase 6.5).
 *
 * Fonte ÚNICA que alimenta a sidebar desktop e o drawer mobile — módulos,
 * canais e páginas na mesma árvore visual, sem um segundo painel dentro da
 * Comunidade.
 *
 * SERVER-SAFE / PURA: sem componentes React, sem "use client", sem imports de
 * UI. `icon` é um identificador string resolvido pela camada visual
 * (src/components/layout/nav-icon.tsx).
 *
 * Tipos de item (a união interna preserva as diferentes naturezas técnicas):
 *  - route:   módulo/página do Portal (href real; active por prefixo).
 *  - channel: canal da Comunidade (slug → rota raiz via channelHref; semântica de
 *             publicação/comentário permanece em src/lib/community/structure.ts).
 *  - page:    página estática (href real; active por igualdade exata).
 *
 * O item de "Painel admin" NÃO vive aqui: fica no menu do avatar (header),
 * atrás do gate real (proxy.ts + requireAdmin no layout de /admin).
 */

import { channelHref } from "@/lib/community/structure";

/**
 * `tour` = identificador ESTÁVEL para o tour guiado (`data-tour`). Nunca usar texto
 * visível ou classe CSS como seletor — eles mudam com facilidade.
 */
export type NavItem =
  | { type: "route"; label: string; href: string; icon: string; tour?: string }
  | { type: "channel"; label: string; slug: string; icon: string; tour?: string }
  | { type: "page"; label: string; href: string; icon: string; tour?: string };

export type NavGroup = { label: string; items: NavItem[] };

/**
 * Árvore da sidebar única. Ordem dos grupos = ordem de exibição.
 *
 * NOTA (Fase 6.5): canais `rotinas` e `suporte-tecnico` são NOVOS — dependem da
 * migration 0016 (CHECK) para aceitar posts; ficam navegáveis/leitura antes
 * disso. Os canais LEGADOS/DEPRECIADOS (`projetos-negocios`, `servicos-oportunidades`,
 * `dicas-novidades`, `beneficios`) NÃO aparecem nesta árvore, mas continuam
 * existindo na config e no banco: seus posts seguem intactos e aparecem no Feed
 * Geral (/community), aguardando inventário de conteúdo. Ver
 * DEPRECATED_CHANNELS em src/lib/community/structure.ts.
 */
export const NAV_TREE: NavGroup[] = [
  {
    label: "Geral",
    items: [
      { type: "route", label: "Início", href: "/dashboard", icon: "home" },
      { type: "route", label: "Comunidade", href: "/community", icon: "message-square-text", tour: "community" },
      { type: "route", label: "Mensagens", href: "/mensagens", icon: "mail" },
    ],
  },
  {
    label: "Boas-vindas",
    items: [
      { type: "channel", label: "Comece por aqui", slug: "comece-por-aqui", icon: "sparkles" },
      { type: "channel", label: "Apresente-se", slug: "apresente-se", icon: "hand" },
      { type: "channel", label: "Rotinas", slug: "rotinas", icon: "repeat" },
      { type: "channel", label: "Comunicados", slug: "comunicados", icon: "megaphone" },
    ],
  },
  {
    label: "Aprender e Construir",
    items: [
      { type: "route", label: "Cursos e Materiais", href: "/courses", icon: "graduation-cap", tour: "courses" },
      { type: "route", label: "Biblioteca", href: "/resources", icon: "library", tour: "resources" },
      { type: "route", label: "Aplicativos", href: "/apps", icon: "layout-grid", tour: "apps" },
      { type: "route", label: "Agentes Especialistas", href: "/agentes", icon: "bot", tour: "agentes" },
    ],
  },
  {
    label: "Participação",
    items: [
      { type: "channel", label: "Lives e Encontros", slug: "lives-encontros", icon: "radio" },
      { type: "channel", label: "Marketing e Vendas", slug: "marketing-vendas", icon: "trending-up" },
      { type: "route", label: "Calendário de Eventos", href: "/calendar", icon: "calendar", tour: "calendar" },
      { type: "route", label: "Ranking", href: "/leaderboard", icon: "trophy", tour: "leaderboard" },
      { type: "route", label: "Recompensas", href: "/rewards", icon: "gift" },
    ],
  },
  {
    label: "Networking",
    items: [
      { type: "channel", label: "Chat Network", slug: "chat-networking", icon: "messages-square", tour: "chat-network" },
      { type: "channel", label: "Vagas e Oportunidades", slug: "vagas-oportunidades", icon: "briefcase" },
      { type: "channel", label: "Parcerias e Colaborações", slug: "parcerias-colaboracoes", icon: "handshake" },
      { type: "channel", label: "Compartilhe seu Projeto", slug: "compartilhe-seu-projeto", icon: "rocket" },
    ],
  },
  {
    label: "Ajuda e Benefícios",
    items: [
      { type: "channel", label: "Dúvidas Gerais", slug: "duvidas-gerais", icon: "help-circle" },
      { type: "channel", label: "Cupons e Descontos", slug: "cupons-descontos", icon: "ticket" },
      { type: "page", label: "Perguntas Frequentes", href: "/community/faq", icon: "info" },
      { type: "channel", label: "Suporte Técnico", slug: "suporte-tecnico", icon: "life-buoy" },
      { type: "page", label: "Reportar Problema", href: "/support/report", icon: "flag" },
    ],
  },
];

/** Barra inferior mobile (enxuta) — a árvore completa vive no drawer. */
export const BOTTOM_NAV: Extract<NavItem, { type: "route" }>[] = [
  { type: "route", label: "Início", href: "/dashboard", icon: "home" },
  { type: "route", label: "Comunidade", href: "/community", icon: "message-square-text" },
  { type: "route", label: "Cursos", href: "/courses", icon: "graduation-cap" },
  { type: "route", label: "Biblioteca", href: "/resources", icon: "library" },
  { type: "route", label: "Calendário", href: "/calendar", icon: "calendar" },
];

/** Resolve o href de destino de qualquer item da nav (canal → rota raiz canônica). */
export function navHref(item: NavItem): string {
  return item.type === "channel" ? channelHref(item.slug) ?? "/community" : item.href;
}

/**
 * Active-state coerente para a árvore unificada (Fase 6.6). Cada canal tem rota
 * raiz própria (ex.: /comece-por-aqui); "Comunidade" (Feed Geral) acende só em
 * /community e no detalhe de post (/post/[id]) — NUNCA junto de um canal.
 */
export function isNavItemActive(pathname: string, item: NavItem): boolean {
  if (item.type === "channel") return pathname === channelHref(item.slug);
  if (item.type === "page") return pathname === item.href;
  // route
  if (item.href === "/community") {
    return pathname === "/community" || pathname.startsWith("/post/");
  }
  return pathname === item.href || pathname.startsWith(item.href + "/");
}
