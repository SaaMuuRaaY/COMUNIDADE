/**
 * Regra de elegibilidade + cooldown do convite ao grupo do WhatsApp.
 * Função PURA (sem I/O) — decidida no servidor e trivialmente testável.
 *
 * Cadência: 3 exibições a partir de quando o membro fica elegível —
 *   1ª: assim que elegível · 2ª: +7 dias · 3ª: +21 dias (a partir da 1ª).
 * Encerram para sempre: "Já entrei" (joined_claimed) e "Não mostrar novamente"
 * (dismissed). Clicar em "Entrar no grupo" só registra o clique (analytics) e
 * NÃO encerra — a cadência segue até o membro confirmar.
 */

export const WHATSAPP_INVITE_MAX_SHOWS = 3;

const DAY_MS = 86_400_000;
/** Dias (a partir da 1ª exibição) em que cada exibição fica liberada. */
const SHOW_SCHEDULE_DAYS = [0, 7, 21] as const;

export type InviteState = {
  /** Onboarding concluído — pré-requisito de elegibilidade. */
  completed_at: string | null;
  whatsapp_invite_first_shown_at: string | null;
  whatsapp_invite_show_count: number | null;
  whatsapp_joined_claimed_at: string | null;
  whatsapp_invite_dismissed_at: string | null;
};

/** Se o popup do convite deve ser exibido agora (dado o estado + o instante). */
export function shouldShowInvite(state: InviteState, nowMs: number): boolean {
  // Pré-requisito: onboarding concluído.
  if (!state.completed_at) return false;
  // Encerrado explicitamente pelo membro.
  if (state.whatsapp_joined_claimed_at || state.whatsapp_invite_dismissed_at) return false;

  const count = state.whatsapp_invite_show_count ?? 0;
  if (count >= WHATSAPP_INVITE_MAX_SHOWS) return false;

  // 1ª exibição: assim que elegível.
  if (count === 0) return true;

  // 2ª/3ª exibição: respeita o cooldown a partir da 1ª.
  const first = state.whatsapp_invite_first_shown_at;
  if (!first) return true; // contador > 0 sem 1ª data (estado inconsistente): libera
  const firstMs = new Date(first).getTime();
  const dueDays = SHOW_SCHEDULE_DAYS[count] ?? SHOW_SCHEDULE_DAYS[SHOW_SCHEDULE_DAYS.length - 1];
  return nowMs >= firstMs + dueDays * DAY_MS;
}
