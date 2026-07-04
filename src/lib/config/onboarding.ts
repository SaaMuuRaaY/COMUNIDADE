/**
 * Opcoes do onboarding (Feature B). AJUSTAVEIS sem migration — as colunas no banco
 * sao text/text[] livres; a validacao (onboardingSchema em schemas.ts) confere
 * contra estas listas. Edite os rotulos/valores aqui conforme o produto evoluir.
 */
export const AI_LEVELS = [
  { value: "iniciante", label: "Iniciante — explorando IA" },
  { value: "intermediario", label: "Intermediário — já uso no dia a dia" },
  { value: "avancado", label: "Avançado — construo com IA" },
] as const;

export const ONBOARDING_GOALS = [
  { value: "aprender", label: "Aprender sobre IA" },
  { value: "aplicar", label: "Aplicar IA no meu negócio" },
  { value: "criar-conteudo", label: "Criar conteúdo" },
  { value: "networking", label: "Fazer networking" },
  { value: "vender-mais", label: "Vender mais" },
] as const;

export const ONBOARDING_INTERESTS = [
  { value: "automacao", label: "Automação" },
  { value: "marketing", label: "Marketing e conteúdo" },
  { value: "vendas", label: "Vendas e prospecção" },
  { value: "gestao", label: "Gestão e processos" },
  { value: "ferramentas", label: "Ferramentas e apps de IA" },
] as const;

export const PARTICIPATION_GOALS = [
  { value: "aprender", label: "Quero aprender" },
  { value: "aplicar", label: "Quero aplicar no negócio" },
  { value: "mentorar", label: "Quero ajudar/mentorar outros" },
] as const;

export const AI_LEVEL_VALUES: readonly string[] = AI_LEVELS.map((o) => o.value);
export const GOAL_VALUES: readonly string[] = ONBOARDING_GOALS.map((o) => o.value);
export const INTEREST_VALUES: readonly string[] = ONBOARDING_INTERESTS.map((o) => o.value);
export const PARTICIPATION_VALUES: readonly string[] = PARTICIPATION_GOALS.map((o) => o.value);
