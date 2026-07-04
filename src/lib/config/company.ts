/**
 * Dados PUBLICOS da empresa exibidos nas paginas legais (/termos, /privacidade).
 * Informacao publica (aparece pra todos) — NAO e secret, NAO vai em env.
 * Atualize aqui e reflete em todas as paginas legais.
 */
export const COMPANY = {
  legalName: "NEXUS CAPITAL ALIANCE",
  // Empresa no Paraguai: identificador fiscal e RUC (nao CNPJ).
  taxIdLabel: "RUC",
  taxId: "92.17.110-9",
  dpoEmail: "suport@portal-nexus.com",
  contactEmail: "suport@portal-nexus.com",
  jurisdiction: "Asunción, Paraguai",
} as const;
