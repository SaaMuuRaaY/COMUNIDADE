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
    startTransition(async () => {
      const newStatus: "going" | "declined" = going ? "declined" : "going";
      const res = await rsvpEventAction(eventId, newStatus);
      if (!res.ok) toast.error(res.error ?? "Erro ao confirmar.");
      else {
        setGoing(!going);
        toast.success(going ? "Presença cancelada." : "Presença confirmada · +20 pontos");
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
