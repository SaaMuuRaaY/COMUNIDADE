import Link from "next/link";
import { Sparkles, ArrowRight } from "lucide-react";
import { Button } from "@/components/ui/button";

/**
 * Aviso NAO-bloqueante de onboarding no topo do dashboard. Renderizado apenas
 * enquanto member_onboarding.completed_at e nulo (some ao completar). Nao usa
 * SectionBanner de proposito (evita segundo <h1> na pagina).
 */
export function OnboardingBanner() {
  return (
    <div className="relative overflow-hidden rounded-xl border border-[var(--accent-line)] bg-card p-4 shadow-[0_0_50px_-20px_var(--accent-glow)] md:p-5">
      <div className="flex items-center gap-3">
        <div className="hidden h-10 w-10 shrink-0 items-center justify-center rounded-lg bg-muted text-[var(--accent)] ring-1 ring-[var(--accent-line)] sm:flex">
          <Sparkles className="h-5 w-5" />
        </div>
        <div className="min-w-0 flex-1">
          <p className="font-medium">Complete seu perfil</p>
          <p className="text-sm text-muted-foreground">
            Conte seus objetivos e interesses pra personalizarmos sua experiência. Menos de 1 minuto.
          </p>
        </div>
        <Button asChild size="sm" className="shrink-0 gap-2">
          <Link href="/onboarding">
            Começar <ArrowRight className="h-4 w-4" />
          </Link>
        </Button>
      </div>
    </div>
  );
}
