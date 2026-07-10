/**
 * Carregador da YouTube IFrame Player API.
 *
 * Contrato:
 *  - singleton Promise (uma carga por sessão, reaproveitada na reabertura do modal);
 *  - só é chamado quando o modal abre (nunca no import da página);
 *  - resolve de imediato se `window.YT?.Player` já existe;
 *  - PRESERVA um `window.onYouTubeIframeAPIReady` pré-existente (encadeia, não sobrescreve);
 *  - não injeta script duplicado (reusa a tag já presente);
 *  - rejeita em erro de rede/CSP (onerror) e por timeout.
 *
 * O player continua em `youtube-nocookie.com` (privacidade); apenas o SCRIPT da API
 * vem de `www.youtube.com` — por isso a CSP libera esse host em `script-src`.
 */

const SCRIPT_SRC = "https://www.youtube.com/iframe_api";
const TIMEOUT_MS = 10_000;

export type YTPlayerState = { data: number };
export type YTPlayer = {
  destroy: () => void;
  getPlayerState?: () => number;
};
type YTNamespace = {
  Player: new (
    el: HTMLElement | string,
    opts: {
      host?: string;
      events?: {
        onReady?: () => void;
        onStateChange?: (e: YTPlayerState) => void;
        onError?: () => void;
      };
    },
  ) => YTPlayer;
  PlayerState: { ENDED: number; PLAYING: number; PAUSED: number };
};

declare global {
  interface Window {
    YT?: YTNamespace;
    onYouTubeIframeAPIReady?: () => void;
  }
}

let promise: Promise<YTNamespace> | null = null;

export function loadYouTubeApi(): Promise<YTNamespace> {
  if (typeof window === "undefined") {
    return Promise.reject(new Error("loadYouTubeApi só roda no cliente."));
  }
  if (window.YT?.Player) return Promise.resolve(window.YT);
  if (promise) return promise;

  promise = new Promise<YTNamespace>((resolve, reject) => {
    let settled = false;
    const finish = (fn: () => void) => {
      if (settled) return;
      settled = true;
      window.clearTimeout(timer);
      fn();
    };

    const timer = window.setTimeout(() => {
      finish(() => {
        promise = null; // permite nova tentativa na próxima abertura
        reject(new Error("Timeout ao carregar a API do YouTube."));
      });
    }, TIMEOUT_MS);

    // Encadeia um callback pré-existente em vez de sobrescrevê-lo.
    const previous = window.onYouTubeIframeAPIReady;
    window.onYouTubeIframeAPIReady = () => {
      try {
        previous?.();
      } catch {
        /* callback de terceiro não derruba o nosso */
      }
      finish(() => {
        if (window.YT?.Player) resolve(window.YT);
        else {
          promise = null;
          reject(new Error("API do YouTube carregou sem YT.Player."));
        }
      });
    };

    const existing = document.querySelector<HTMLScriptElement>(`script[src="${SCRIPT_SRC}"]`);
    if (existing) return; // já injetado: aguardamos o callback acima

    const tag = document.createElement("script");
    tag.src = SCRIPT_SRC;
    tag.async = true;
    tag.onerror = () =>
      finish(() => {
        promise = null;
        reject(new Error("Falha ao carregar a API do YouTube (rede ou CSP)."));
      });
    document.head.appendChild(tag);
  });

  return promise;
}
