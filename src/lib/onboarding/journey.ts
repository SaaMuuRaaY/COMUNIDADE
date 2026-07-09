/**
 * Estado da Jornada de Onboarding 2.0 — função PURA (sem I/O), fonte única da
 * lógica de progresso/desbloqueio. Reusada pelo checklist, dashboard, callback e
 * pela decisão de publicação (espelha o gate RLS `onboarding_allows_post` da 0038).
 *
 * Regra central: `completed_at` (formulário) NÃO libera publicação geral — apenas
 * `/apresente-se`. Os demais canais só liberam com `introduction_completed_at`.
 * Usuários antigos (`grandfathered_at`) são dispensados da jornada.
 */

export const WELCOME_TOUR_VERSION = "2026-07-09";

/** Colunas de member_onboarding relevantes à jornada (subset do row). */
export type JourneyRow = {
  completed_at: string | null;
  welcome_video_completed_at: string | null;
  introduction_completed_at: string | null;
  journey_completed_at: string | null;
  grandfathered_at: string | null;
  // convite (0037) — passo RECOMENDADO, não bloqueia
  whatsapp_invite_clicked_at: string | null;
  whatsapp_joined_claimed_at: string | null;
  whatsapp_invite_dismissed_at: string | null;
};

export type JourneyStepKey = "signup" | "form" | "video" | "introduction" | "whatsapp";

export type JourneyStep = {
  key: JourneyStepKey;
  label: string;
  done: boolean;
  essential: boolean;
  href: string;
  cta: string;
};

/** Precisa passar pela nova jornada? Grandfathered e quem já completou não. */
export function needsOnboarding(
  row: Pick<JourneyRow, "completed_at" | "grandfathered_at"> | null,
): boolean {
  if (!row) return true; // sem linha = novo membro
  return !row.completed_at && !row.grandfathered_at;
}

/** Convite do WhatsApp "resolvido" (clicou / declarou / recusou) — não é "entrada verificada". */
export function whatsappResolved(row: JourneyRow): boolean {
  return !!(
    row.whatsapp_invite_clicked_at ||
    row.whatsapp_joined_claimed_at ||
    row.whatsapp_invite_dismissed_at
  );
}

/**
 * Deriva os passos da jornada (checklist) a partir do estado persistido.
 * `videoRequired` = há um vídeo de boas-vindas configurado no Admin. Se não houver,
 * o passo do vídeo é omitido e não bloqueia a conclusão (evita passo vazio/deadlock).
 */
export function deriveJourney(
  row: JourneyRow,
  opts?: { videoRequired?: boolean },
): {
  steps: JourneyStep[];
  essentialsDone: boolean;
  journeyDone: boolean;
  introDone: boolean;
} {
  const videoRequired = opts?.videoRequired ?? true;
  const formDone = !!row.completed_at;
  const videoDone = !!row.welcome_video_completed_at;
  const introDone = !!row.introduction_completed_at;

  const steps: JourneyStep[] = [
    { key: "signup", label: "Cadastro realizado", done: true, essential: false, href: "/dashboard", cta: "Ver início" },
    { key: "form", label: "Perfil e interesses preenchidos", done: formDone, essential: true, href: "/onboarding", cta: "Preencher" },
  ];
  if (videoRequired) {
    steps.push({ key: "video", label: "Assistir ao vídeo de boas-vindas", done: videoDone, essential: true, href: "/comece-por-aqui", cta: "Assistir ao vídeo" });
  }
  steps.push(
    { key: "introduction", label: "Fazer sua apresentação", done: introDone, essential: true, href: "/apresente-se", cta: "Fazer minha apresentação" },
    { key: "whatsapp", label: "Entrar no grupo do WhatsApp", done: whatsappResolved(row), essential: false, href: "/comece-por-aqui", cta: "Conhecer o grupo" },
  );

  const essentialsDone = formDone && (videoRequired ? videoDone : true) && introDone;
  return {
    steps,
    essentialsDone,
    journeyDone: !!row.journey_completed_at,
    introDone,
  };
}
