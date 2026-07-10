"use client";

import * as React from "react";
import { Compass } from "lucide-react";
import { Button } from "@/components/ui/button";
import { MenuTour } from "@/components/onboarding/menu-tour";

/**
 * "Rever o tour" — roda SÓ a experiência visual (mode="review"): não chama
 * completeJourneyAction, não altera pontos nem o `journey_completed_at` original.
 */
export function TourReplayButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <>
      <Button variant="outline" size="sm" className="gap-2" onClick={() => setOpen(true)}>
        <Compass className="h-4 w-4" /> Rever o tour
      </Button>
      <MenuTour open={open} mode="review" onClose={() => setOpen(false)} />
    </>
  );
}
