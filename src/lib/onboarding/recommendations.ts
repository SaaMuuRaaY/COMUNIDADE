/**
 * Recomendações por regra simples (sem IA/motor) a partir de interesses/objetivos
 * do onboarding. Cumpre a promessa "personalizar sua experiência" que o formulário
 * fazia sem entregar. Dedup por href, no máximo 5.
 */
export type Recommendation = { label: string; href: string };

const BY_INTEREST: Record<string, Recommendation[]> = {
  automacao: [
    { label: "Recursos de automação", href: "/resources" },
    { label: "Apps de automação", href: "/apps" },
  ],
  marketing: [{ label: "Canal Marketing e Vendas", href: "/marketing-e-vendas" }],
  vendas: [
    { label: "Canal Marketing e Vendas", href: "/marketing-e-vendas" },
    { label: "Eventos e lives", href: "/calendar" },
  ],
  gestao: [{ label: "Recursos e templates", href: "/resources" }],
  ferramentas: [
    { label: "Biblioteca de recursos", href: "/resources" },
    { label: "Aplicativos", href: "/apps" },
  ],
};

const BY_GOAL: Record<string, Recommendation[]> = {
  aprender: [{ label: "Cursos e aulas", href: "/courses" }],
  networking: [
    { label: "Chat Network", href: "/chat-e-networking" },
    { label: "Apresente-se", href: "/apresente-se" },
  ],
  "criar-conteudo": [{ label: "Marketing e Vendas", href: "/marketing-e-vendas" }],
  "vender-mais": [{ label: "Marketing e Vendas", href: "/marketing-e-vendas" }],
  aplicar: [{ label: "Aplicativos", href: "/apps" }],
};

export function getRecommendations(
  interests: string[] | null,
  goals: string[] | null,
): Recommendation[] {
  const out = new Map<string, Recommendation>();
  for (const i of interests ?? []) for (const r of BY_INTEREST[i] ?? []) out.set(r.href, r);
  for (const g of goals ?? []) for (const r of BY_GOAL[g] ?? []) out.set(r.href, r);
  if (out.size === 0) {
    out.set("/courses", { label: "Cursos e aulas", href: "/courses" });
    out.set("/community", { label: "Comunidade", href: "/community" });
  }
  return [...out.values()].slice(0, 5);
}
