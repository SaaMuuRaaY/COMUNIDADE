"use client";

import Script from "next/script";

const SITE_KEY = process.env.NEXT_PUBLIC_TURNSTILE_SITE_KEY;

/**
 * Widget do Cloudflare Turnstile (CAPTCHA do signup — incidente 2026-07-10).
 *
 * Renderiza SÓ quando NEXT_PUBLIC_TURNSTILE_SITE_KEY existe: sem a chave, some sem
 * quebrar os formulários (para o CAPTCHA ficar desligado no Dashboard também). Com
 * a chave, o script injeta o campo `cf-turnstile-response` no <form> pai; a Server
 * Action o lê e envia como captchaToken.
 */
export function Turnstile() {
  if (!SITE_KEY) return null;
  return (
    <>
      <Script
        src="https://challenges.cloudflare.com/turnstile/v0/api.js"
        strategy="afterInteractive"
      />
      <div className="cf-turnstile" data-sitekey={SITE_KEY} data-theme="auto" />
    </>
  );
}
