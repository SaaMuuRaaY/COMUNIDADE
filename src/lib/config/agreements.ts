/**
 * Versao dos acordos aceitos no onboarding. Suba manualmente quando termos/
 * privacidade/regras mudarem materialmente — gravado em
 * member_onboarding.agreements_version no aceite (sem IP/User-Agent, privacidade).
 * As paginas seguem estaticas no Git; esta constante e a "versao" de referencia.
 */
export const AGREEMENTS_VERSION = "2026-07-04";

export const AGREEMENTS = [
  { key: "termos", label: "Termos de Uso", href: "/termos" },
  { key: "privacidade", label: "Política de Privacidade", href: "/privacidade" },
  { key: "regras", label: "Regras da Comunidade", href: "/community/regras" },
] as const;

export type AgreementRef = (typeof AGREEMENTS)[number];
