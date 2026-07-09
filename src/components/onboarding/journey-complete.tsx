import Link from "next/link";
import { PartyPopper, ArrowRight, Trophy, MessagesSquare } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import type { Recommendation } from "@/lib/onboarding/recommendations";

/**
 * Tela de conclusão da jornada — mostrada em /comece-por-aqui quando
 * journey_completed_at está preenchido. Recapitula pontos + recomendações reais.
 */
export function JourneyComplete({
  points,
  recommendations,
}: {
  points: number;
  recommendations: Recommendation[];
}) {
  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-1">
          <h2 className="flex items-center gap-2 font-semibold">
            <PartyPopper className="h-5 w-5 text-[var(--accent)]" /> Jornada concluída
          </h2>
          <p className="text-sm text-muted-foreground">
            Você completou seus primeiros passos no Portal Nexus. Todas as áreas de publicação
            estão liberadas.
          </p>
        </div>

        <p className="flex items-center gap-2 text-sm">
          <Trophy className="h-4 w-4 text-[var(--accent)]" /> Você já tem{" "}
          <span className="font-semibold">{points}</span> pontos.
        </p>

        <div className="space-y-2">
          <p className="text-sm font-medium">Recomendados para você</p>
          <div className="flex flex-wrap gap-2">
            {recommendations.map((r) => (
              <Button key={r.href} asChild size="sm" variant="outline">
                <Link href={r.href}>
                  {r.label} <ArrowRight className="ml-1 h-3.5 w-3.5" />
                </Link>
              </Button>
            ))}
          </div>
        </div>

        <Button asChild size="sm" className="gap-2">
          <Link href="/chat-e-networking">
            <MessagesSquare className="h-4 w-4" /> Entrar no Chat Network
          </Link>
        </Button>
      </CardContent>
    </Card>
  );
}
