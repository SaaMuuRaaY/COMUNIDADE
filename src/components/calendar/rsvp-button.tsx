"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { rsvpEventAction } from "@/server/actions/resources-apps-events";
import { toast } from "sonner";

export function RsvpButton({ eventId, initiallyGoing }: { eventId: string; initiallyGoing: boolean }) {
  const [going, setGoing] = React.useState(initiallyGoing);
  const [pending, startTransition] = React.useTransition();
  // Guard de reentrância: bloqueia 2º clique no mesmo tick (ref síncrono, não
  // sujeito ao closure stale de `going`/`pending`). Evita duas requests.
  const inFlight = React.useRef(false);

  function toggle() {
    if (inFlight.current) return;
    inFlight.current = true;
    const next = !going;
    startTransition(async () => {
      try {
        const res = await rsvpEventAction(eventId, next ? "going" : "declined");
        if (!res.ok) toast.error(res.error ?? "Erro ao confirmar.");
        else {
          setGoing(next);
          toast.success(next ? "Presença confirmada · +20 pontos" : "Presença cancelada.");
        }
      } finally {
        inFlight.current = false;
      }
    });
  }

  return (
    <Button
      onClick={toggle}
      disabled={pending}
      variant={going ? "default" : "outline"}
      size="sm"
      className="gap-2"
    >
      <Check className="h-4 w-4" />
      {going ? "Vou participar" : "Confirmar presença"}
    </Button>
  );
}
