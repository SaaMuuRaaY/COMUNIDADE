"use client";

import { useEffect, useState } from "react";
import Link from "next/link";
import { Button } from "@/components/ui/button";

const KEY = "codex-cookie-consent";

export function CookieConsent() {
  const [show, setShow] = useState(false);

  useEffect(() => {
    // Lê fora do corpo síncrono do efeito para evitar setState em cascata
    // (react-hooks/set-state-in-effect).
    const id = requestAnimationFrame(() => {
      try {
        if (!localStorage.getItem(KEY)) setShow(true);
      } catch {
        /* localStorage indisponível — não bloqueia a UI */
      }
    });
    return () => cancelAnimationFrame(id);
  }, []);

  if (!show) return null;

  function accept() {
    try {
      localStorage.setItem(KEY, "1");
    } catch {
      /* ignore */
    }
    setShow(false);
  }

  return (
    <div className="fixed inset-x-0 bottom-0 z-50 border-t bg-background/95 p-4 backdrop-blur">
      <div className="mx-auto flex max-w-4xl flex-col items-center gap-3 sm:flex-row sm:justify-between">
        <p className="text-xs text-muted-foreground">
          Usamos cookies essenciais para autenticação e para melhorar sua experiência. Ao continuar,
          você concorda com a nossa{" "}
          <Link href="/privacidade" className="underline">
            Política de Privacidade
          </Link>
          .
        </p>
        <Button size="sm" onClick={accept} className="shrink-0">
          Entendi
        </Button>
      </div>
    </div>
  );
}
