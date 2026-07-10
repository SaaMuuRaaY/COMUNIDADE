"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { PartyPopper, Check } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";

/**
 * Celebração da 1ª apresentação. Disparada SOMENTE quando createPostAction devolve
 * `isFirstIntro === true` (transição real pendente→concluída no servidor) — por isso
 * não reaparece em refresh, edição, reabertura do post nem se a publicação for apagada.
 * Nenhum estado extra é persistido.
 *
 * `canvas-confetti` entra por import dinâmico (fica fora do bundle das outras páginas)
 * e é suprimido quando o usuário pede menos movimento.
 */
function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

export function IntroductionCelebration() {
  const router = useRouter();
  const [open, setOpen] = React.useState(true);

  React.useEffect(() => {
    if (prefersReducedMotion()) return;
    let cancelled = false;
    void (async () => {
      try {
        const { default: confetti } = await import("canvas-confetti");
        if (cancelled) return;
        const burst = (particleRatio: number, opts: Record<string, unknown>) =>
          confetti({ origin: { y: 0.7 }, particleCount: Math.floor(160 * particleRatio), ...opts });
        burst(0.25, { spread: 26, startVelocity: 55 });
        burst(0.2, { spread: 60 });
        burst(0.35, { spread: 100, decay: 0.91, scalar: 0.8 });
      } catch {
        /* confete é enfeite: falha não quebra a jornada */
      }
    })();
    return () => {
      cancelled = true;
    };
  }, []);

  function goOn() {
    setOpen(false);
    router.push("/comece-por-aqui");
  }

  return (
    <Dialog open={open} onOpenChange={(o) => (o ? setOpen(true) : goOn())}>
      <DialogContent className="max-w-md">
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <PartyPopper className="h-5 w-5 text-[var(--accent)]" />
            Parabéns, sua apresentação foi publicada!
          </DialogTitle>
          <DialogDescription>
            Agora você já faz parte oficialmente da comunidade. Vamos conhecer os próximos passos.
          </DialogDescription>
        </DialogHeader>
        <p className="flex items-center gap-2 text-sm text-muted-foreground">
          <Check className="h-4 w-4 text-[var(--accent)]" /> Apresentação publicada
        </p>
        <Button className="w-full" onClick={goOn}>
          Continuar
        </Button>
      </DialogContent>
    </Dialog>
  );
}
