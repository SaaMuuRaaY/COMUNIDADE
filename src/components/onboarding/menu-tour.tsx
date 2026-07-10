"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Button } from "@/components/ui/button";
import { useNavDrawer } from "@/components/layout/nav-drawer-context";
import { TOUR_STEPS, type TourStep } from "@/lib/onboarding/tour-steps";
import { completeJourneyAction } from "@/server/actions/onboarding";
import { toast } from "sonner";

type Rect = { top: number; left: number; width: number; height: number };

/** Só o elemento VISÍVEL: o mesmo data-tour existe na sidebar E no drawer. */
function findVisibleTarget(target: string): HTMLElement | null {
  const nodes = Array.from(document.querySelectorAll<HTMLElement>(`[data-tour="${target}"]`));
  return nodes.find((el) => el.getClientRects().length > 0) ?? null;
}

function rectOf(el: HTMLElement): Rect {
  const r = el.getBoundingClientRect();
  return { top: r.top, left: r.left, width: r.width, height: r.height };
}

function prefersReducedMotion(): boolean {
  try {
    return window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  } catch {
    return false;
  }
}

/**
 * Tour guiado dos módulos. Reusa a NAV_TREE (data-tour) — não é um segundo sistema
 * de onboarding nem depende de texto/classe CSS.
 *
 * Regras (F9.3):
 *  - alvo = elemento visível; item ausente é IGNORADO (sem loop infinito);
 *  - mobile: abre o drawer e AGUARDA a transição antes de medir;
 *  - NÃO aplica segundo scroll-lock (o Sheet já controla o body quando aberto);
 *  - clique fora NÃO conclui; Escape = "continuar depois";
 *  - "Pular e concluir" e o último passo chamam completeJourneyAction();
 *  - "Continuar depois" não altera journey_completed_at.
 *
 * `mode="review"` (Rever o tour) roda só a experiência visual: nunca conclui nada.
 */
export function MenuTour({
  open,
  mode = "journey",
  onClose,
}: {
  open: boolean;
  mode?: "journey" | "review";
  onClose: () => void;
}) {
  const router = useRouter();
  const { setOpen: setDrawerOpen } = useNavDrawer();
  const [index, setIndex] = React.useState(0);
  const [rect, setRect] = React.useState<Rect | null>(null);
  const [pending, setPending] = React.useState(false);
  const cardRef = React.useRef<HTMLDivElement | null>(null);
  const restoreFocusRef = React.useRef<HTMLElement | null>(null);

  // Passos cujo alvo existe no DOM (ignora item ausente para o papel do usuário).
  const [steps, setSteps] = React.useState<TourStep[]>([]);

  const isMobile = React.useCallback(
    () => typeof window !== "undefined" && window.matchMedia("(max-width: 767px)").matches,
    [],
  );

  // Abertura: guarda o foco, abre o drawer no mobile e resolve os passos disponíveis.
  React.useEffect(() => {
    if (!open) return;
    restoreFocusRef.current = (document.activeElement as HTMLElement) ?? null;
    if (isMobile()) setDrawerOpen(true);

    // Aguarda a transição do Sheet antes de medir (senão o rect vem zerado).
    const t = window.setTimeout(() => {
      const available = TOUR_STEPS.filter((s) => findVisibleTarget(s.target));
      setSteps(available);
      setIndex(0);
    }, isMobile() ? 380 : 0);

    return () => window.clearTimeout(t);
  }, [open, isMobile, setDrawerOpen]);

  const step = steps[index];

  // Mede o alvo do passo atual e reposiciona em scroll/resize.
  React.useEffect(() => {
    if (!open || !step) return;
    // Os passos já foram filtrados na abertura (item ausente é ignorado). Se o alvo
    // sumir no meio do tour, degradamos sem spotlight — nunca avançamos sozinhos
    // (evita loop) nem travamos.
    //
    // Scroll INSTANTÂNEO de propósito: com scroll suave o alvo se move quadro a
    // quadro e o card (ancorado no rect) acompanha — os botões viram alvo móvel,
    // difícil de clicar (o Playwright reprova por "element is not stable", e o
    // usuário sente o mesmo).
    findVisibleTarget(step.target)?.scrollIntoView({ block: "nearest", behavior: "auto" });

    const measure = () => {
      const target = findVisibleTarget(step.target);
      setRect(target ? rectOf(target) : null);
    };
    measure();
    const raf = window.requestAnimationFrame(measure);
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      window.cancelAnimationFrame(raf);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [open, step, steps.length]);

  // Foco no card + Escape = continuar depois. Sem scroll-lock próprio.
  React.useEffect(() => {
    if (!open) return;
    cardRef.current?.focus();
    function onKey(e: KeyboardEvent) {
      if (e.key === "Escape") {
        e.preventDefault();
        continueLater();
      }
    }
    window.addEventListener("keydown", onKey);
    return () => window.removeEventListener("keydown", onKey);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [open, index, steps.length]);

  function restoreFocus() {
    restoreFocusRef.current?.focus?.();
  }

  function close() {
    if (isMobile()) setDrawerOpen(false);
    restoreFocus();
    onClose();
  }

  /** Não altera journey_completed_at. */
  function continueLater() {
    close();
  }

  async function finishAndComplete() {
    if (mode === "review") {
      close();
      return;
    }
    setPending(true);
    const res = await completeJourneyAction();
    setPending(false);
    if (!res.ok) {
      toast.error(res.error ?? "Não foi possível concluir a jornada.");
      return; // mantém o tour aberto para nova tentativa
    }
    close();
    router.push("/community");
  }

  if (!open || !step || !steps.length) return null;

  const last = index === steps.length - 1;
  const pad = 6;
  const spotlight: React.CSSProperties | null = rect
    ? {
        top: rect.top - pad,
        left: rect.left - pad,
        width: rect.width + pad * 2,
        height: rect.height + pad * 2,
      }
    : null;

  // Posição do card SEM estourar a viewport: quando o alvo está na metade de baixo,
  // ancoramos pelo `bottom` (o card cresce para cima). No desktop, se não couber à
  // direita, vai para a esquerda. Sem isso, itens baixos (Ranking) empurrariam os
  // botões para fora da tela.
  const M = 12;
  const CARD_W = 320;
  const vw = typeof window !== "undefined" ? window.innerWidth : 1024;
  const vh = typeof window !== "undefined" ? window.innerHeight : 768;
  const anchorTop = rect ? rect.top < vh / 2 : true;

  let cardStyle: React.CSSProperties = { top: 24, left: 24, width: CARD_W };
  if (rect && isMobile()) {
    cardStyle = anchorTop
      ? { top: rect.top + rect.height + M, left: M, right: M }
      : { bottom: vh - rect.top + M, left: M, right: M };
  } else if (rect) {
    const fitsRight = vw - (rect.left + rect.width) - 16 >= CARD_W + M;
    const left = fitsRight ? rect.left + rect.width + 16 : Math.max(M, rect.left - CARD_W - 16);
    cardStyle = anchorTop
      ? { top: Math.max(M, rect.top - 8), left, width: CARD_W }
      : { bottom: Math.max(M, vh - rect.top - rect.height - 8), left, width: CARD_W };
  }

  return (
    <div className="fixed inset-0 z-[60]" role="presentation">
      {/* Dimmer: clique fora NÃO conclui e NÃO fecha. */}
      <div className="absolute inset-0 bg-black/60" aria-hidden="true" />

      {spotlight ? (
        <div
          aria-hidden="true"
          className="pointer-events-none absolute rounded-md ring-2 ring-[var(--accent)]"
          style={{
            ...spotlight,
            boxShadow: "0 0 0 9999px rgba(0,0,0,0.6)",
            transition: prefersReducedMotion() ? "none" : "all 180ms ease",
          }}
        />
      ) : null}

      <div
        ref={cardRef}
        tabIndex={-1}
        role="dialog"
        aria-modal="true"
        aria-labelledby="tour-title"
        aria-describedby="tour-desc"
        className="absolute rounded-xl border bg-background p-4 shadow-lg outline-none"
        style={cardStyle}
      >
        <p className="text-xs text-muted-foreground" aria-live="polite">
          Passo {index + 1} de {steps.length}
        </p>
        <h2 id="tour-title" className="mt-1 font-semibold">
          {step.title}
        </h2>
        <p id="tour-desc" className="mt-1 text-sm text-muted-foreground">
          {step.description}
        </p>

        <div className="mt-4 flex flex-wrap items-center gap-2">
          <Button
            variant="ghost"
            size="sm"
            onClick={() => setIndex((i) => Math.max(0, i - 1))}
            disabled={index === 0 || pending}
          >
            Voltar
          </Button>
          {last ? (
            <Button size="sm" onClick={() => void finishAndComplete()} disabled={pending}>
              {pending ? "Concluindo…" : mode === "review" ? "Fechar" : "Ir para a Comunidade"}
            </Button>
          ) : (
            <Button size="sm" onClick={() => setIndex((i) => i + 1)} disabled={pending}>
              Próximo
            </Button>
          )}
          <div className="ml-auto flex gap-2">
            <Button variant="ghost" size="sm" onClick={continueLater} disabled={pending}>
              Continuar depois
            </Button>
            {mode === "journey" && !last ? (
              <Button variant="outline" size="sm" onClick={() => void finishAndComplete()} disabled={pending}>
                Pular e concluir
              </Button>
            ) : null}
          </div>
        </div>
      </div>
    </div>
  );
}
