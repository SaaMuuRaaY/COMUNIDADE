import Link from "next/link";
import { Check, Circle } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { JourneyStep } from "@/lib/onboarding/journey";

/**
 * Checklist da jornada em /comece-por-aqui. Apresentacional — recebe os passos já
 * derivados (`deriveJourney`) pela página. Cada passo pendente tem um CTA direto.
 */
export function OnboardingChecklist({ steps }: { steps: JourneyStep[] }) {
  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div>
          <h2 className="font-semibold">Sua jornada no Portal Nexus</h2>
          <p className="text-xs text-muted-foreground">
            Complete os passos para liberar todas as publicações da comunidade.
          </p>
        </div>
        <ul className="space-y-2">
          {steps.map((s) => (
            <li key={s.key} className="flex items-center justify-between gap-3">
              <span className="flex items-center gap-2 text-sm">
                {s.done ? (
                  <Check className="h-4 w-4 text-[var(--accent)]" />
                ) : (
                  <Circle className="h-4 w-4 text-muted-foreground" />
                )}
                <span className={s.done ? "text-muted-foreground line-through" : ""}>{s.label}</span>
              </span>
              {!s.done ? (
                <Button asChild size="sm" variant="outline" className="shrink-0">
                  <Link href={s.href}>{s.cta}</Link>
                </Button>
              ) : null}
            </li>
          ))}
        </ul>
      </CardContent>
    </Card>
  );
}
