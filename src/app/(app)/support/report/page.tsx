import Link from "next/link";
import { Flag, ListChecks, MessageSquareText } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { requireProfile } from "@/lib/auth/current-user";
import { SectionBanner } from "@/components/shared/section-banner";

export const metadata = { title: "Reportar Problema" };

// Fase 6.5 — página estática de suporte (NÃO é um feed público). Sem sistema de
// tickets, sem tabela nova, sem e-mail hardcodado. A ação real de envio reutiliza
// o canal de suporte já existente na comunidade.
const CHECKLIST = [
  "Página ou funcionalidade afetada",
  "Descrição do problema",
  "Passos para reproduzir",
  "Mensagem de erro (se houver)",
  "Dispositivo e navegador",
  "Print da tela, quando aplicável",
];

export default async function ReportProblemPage() {
  await requireProfile();

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <SectionBanner
        icon={Flag}
        eyebrow="Suporte"
        title="Reportar Problema"
        description="Encontrou um erro ou algo que não funciona como esperado? Ajude a equipe a corrigir."
      />

      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="flex items-center gap-2 text-sm font-medium">
            <ListChecks className="h-4 w-4 text-[var(--accent)]" /> O que incluir no relato
          </p>
          <ul className="ml-6 list-disc space-y-1 text-sm text-muted-foreground">
            {CHECKLIST.map((item) => (
              <li key={item}>{item}</li>
            ))}
          </ul>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-6">
          <p className="text-sm text-muted-foreground">
            Envie seu relato no canal de suporte da comunidade — a equipe e outros
            membros acompanham por lá.
          </p>
          <Button asChild size="sm" className="gap-2">
            <Link href="/duvidas-gerais">
              <MessageSquareText className="h-4 w-4" /> Abrir no canal de suporte
            </Link>
          </Button>
        </CardContent>
      </Card>
    </div>
  );
}
