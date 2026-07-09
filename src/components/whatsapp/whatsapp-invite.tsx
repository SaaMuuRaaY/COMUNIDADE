"use client";

import * as React from "react";
import { MessageCircle } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import {
  recordInviteShownAction,
  recordInviteClickedAction,
  claimJoinedAction,
  dismissInviteAction,
} from "@/server/actions/whatsapp";

/**
 * Popup de convite ao grupo do WhatsApp. Renderizado pelo dashboard SÓ quando o
 * membro é elegível (onboarding concluído + cooldown). Registra a exibição 1× ao
 * montar. "Entrar no grupo" abre o link e registra o clique (não encerra);
 * "Já entrei" / "Não mostrar novamente" encerram a campanha; "Agora não" só fecha.
 */
export function WhatsAppInvite({
  url,
  title,
  description,
}: {
  url: string;
  title: string;
  description: string;
}) {
  const [open, setOpen] = React.useState(true);
  const [pending, startTransition] = React.useTransition();
  const recorded = React.useRef(false);

  React.useEffect(() => {
    if (recorded.current) return;
    recorded.current = true;
    void recordInviteShownAction(); // fire-and-forget: não bloqueia a UI
  }, []);

  function joinGroup() {
    // Defesa em profundidade: só abre https (nunca javascript:/data:), mesmo que
    // uma URL ruim tenha escapado da validação do Admin.
    let safe = false;
    try {
      safe = new URL(url).protocol === "https:";
    } catch {
      safe = false;
    }
    if (safe) {
      // window.open síncrono (antes de qualquer await) para não ser barrado pelo popup blocker.
      window.open(url, "_blank", "noopener,noreferrer");
      void recordInviteClickedAction();
    }
    setOpen(false);
  }

  function claimJoined() {
    startTransition(async () => {
      await claimJoinedAction();
      setOpen(false);
    });
  }

  function dismiss() {
    startTransition(async () => {
      await dismissInviteAction();
      setOpen(false);
    });
  }

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogContent>
        <DialogHeader>
          <DialogTitle className="flex items-center gap-2">
            <MessageCircle className="h-5 w-5 text-[var(--accent)]" />
            {title}
          </DialogTitle>
          <DialogDescription>{description}</DialogDescription>
        </DialogHeader>
        <DialogFooter className="flex-col gap-2 sm:flex-col sm:space-x-0">
          <Button onClick={joinGroup} className="w-full">
            Entrar no grupo
          </Button>
          <div className="flex gap-2">
            <Button
              variant="ghost"
              onClick={() => setOpen(false)}
              disabled={pending}
              className="flex-1"
            >
              Agora não
            </Button>
            <Button variant="outline" onClick={claimJoined} disabled={pending} className="flex-1">
              Já entrei
            </Button>
          </div>
          <Button
            variant="ghost"
            size="sm"
            onClick={dismiss}
            disabled={pending}
            className="text-xs text-muted-foreground"
          >
            Não mostrar novamente
          </Button>
        </DialogFooter>
      </DialogContent>
    </Dialog>
  );
}
