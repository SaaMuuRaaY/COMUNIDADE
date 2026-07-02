import { Bot, Clock, Sparkles } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/current-user";
import { SectionBanner } from "@/components/shared/section-banner";

export const metadata = { title: "Agentes Especialistas" };

// Fase 6.5 — feature FUTURA. Página mínima e profissional em "Em preparação":
// sem backend de IA, sem integração de LLM, sem formulário falso, sem botão que
// não funciona. Apenas apresenta o que virá.
export default async function AgentesPage() {
  await requireProfile();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <SectionBanner
        icon={Bot}
        eyebrow="Portal Nexus"
        title="Agentes Especialistas"
        description="Converse com agentes e inteligências especializadas do Portal Nexus."
        variant="featured"
      />

      <Card>
        <CardContent className="space-y-5 p-6">
          <Badge variant="secondary" className="gap-1.5">
            <Clock className="h-3.5 w-3.5" /> Em preparação
          </Badge>

          <p className="text-sm leading-relaxed text-muted-foreground">
            Estamos construindo os Agentes Especialistas: assistentes focados em
            temas do Portal Nexus para tirar dúvidas, orientar decisões e acelerar
            a execução dos seus projetos. Esta área ainda não está disponível.
          </p>

          <div className="space-y-2">
            <p className="flex items-center gap-2 text-sm font-medium">
              <Sparkles className="h-4 w-4 text-[var(--accent)]" /> O que vem por aí
            </p>
            <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
              <li>Agentes especializados por tema.</li>
              <li>Respostas contextualizadas ao Portal Nexus.</li>
              <li>Apoio na construção e no acompanhamento dos seus projetos.</li>
            </ul>
          </div>

          <p className="text-xs text-muted-foreground">
            Avisaremos na comunidade assim que esta funcionalidade estiver liberada.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
