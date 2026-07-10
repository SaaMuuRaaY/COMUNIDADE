"use client";

import * as React from "react";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;
const SCRIPT_SRC = "https://challenges.cloudflare.com/turnstile/v0/api.js?render=explicit";

type TurnstileApi = {
  render: (el: HTMLElement, opts: Record<string, unknown>) => string;
  remove: (id: string) => void;
};
declare global {
  interface Window {
    turnstile?: TurnstileApi;
  }
}

let scriptPromise: Promise<void> | null = null;
function loadTurnstileScript(): Promise<void> {
  if (typeof window === "undefined") return Promise.resolve();
  if (window.turnstile) return Promise.resolve();
  if (scriptPromise) return scriptPromise;
  scriptPromise = new Promise<void>((resolve, reject) => {
    const s = document.createElement("script");
    s.src = SCRIPT_SRC;
    s.async = true;
    s.defer = true;
    s.onload = () => resolve();
    s.onerror = () => {
      scriptPromise = null; // permite nova tentativa numa próxima montagem
      reject(new Error("turnstile: script não carregou"));
    };
    document.head.appendChild(s);
  });
  return scriptPromise;
}

/**
 * Widget do Cloudflare Turnstile (CAPTCHA — incidente 2026-07-10).
 *
 * Renderização EXPLÍCITA (window.turnstile.render), não implícita: o modo implícito
 * escaneia a página só no load do script e NÃO reaparece após navegação client-side
 * entre /login, /register e /forgot-password. O render explícito monta o widget a
 * cada mount do form e o remove no unmount.
 *
 * Sem NEXT_PUBLIC_TURNSTILE_SITE_KEY o widget some e os forms funcionam (o token
 * ausente é ignorado quando o CAPTCHA está desligado no Supabase). O widget injeta
 * o campo `cf-turnstile-response` no <form> pai; a Server Action o lê como captchaToken.
 */
export function Turnstile() {
  const ref = React.useRef<HTMLDivElement>(null);

  React.useEffect(() => {
    if (!SITE_KEY || !ref.current) return;
    const container = ref.current;
    let widgetId: string | undefined;
    let cancelled = false;

    loadTurnstileScript()
      .then(() => {
        if (cancelled || !window.turnstile) return;
        widgetId = window.turnstile.render(container, { sitekey: SITE_KEY, theme: "auto" });
      })
      .catch(() => {
        /* script bloqueado/offline: sem widget. Com CAPTCHA desligado, o form ainda funciona. */
      });

    return () => {
      cancelled = true;
      if (widgetId && window.turnstile) {
        try {
          window.turnstile.remove(widgetId);
        } catch {
          /* já removido */
        }
      }
    };
  }, []);

  if (!SITE_KEY) return null;
  return <div ref={ref} />;
}
