"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Check } from "lucide-react";
import { rsvpEventAction } from "@/server/actions/resources-apps-events";
import { toast } from "sonner";

export function RsvpButton({ eventId, initiallyGoing }: { eventId: string; initiallyGoing: boolean }) {
  const [going, setGoing] = React.useState(initiallyGoing);
  const [pending, startTransition] = React.useTransition();

  function toggle() {
    // Captura o alvo uma única vez para evitar estado stale em clique duplo
    // (o botão já é disabled durante `pending`, mas isto torna o toggle robusto).
    const next = !going;
    startTransition(async () => {
      const res = await rsvpEventAction(eventId, next ? "going" : "declined");
      if (!res.ok) toast.error(res.error ?? "Erro ao confirmar.");
      else {
        setGoing(next);
        toast.success(next ? "Presença confirmada · +20 pontos" : "Presença cancelada.");
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
