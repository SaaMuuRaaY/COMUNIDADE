import { Collapsible } from "@/components/ui/collapsible";

export const metadata = { title: "Perguntas frequentes · Comunidade" };

const FAQ: { q: string; a: string }[] = [
  {
    q: "Como funcionam os canais?",
    a: "A comunidade é organizada em grupos e canais temáticos. Escolha o canal pela barra lateral (ou pelo seletor no topo, no celular) e publique onde fizer sentido.",
  },
  {
    q: "Quem pode publicar em cada canal?",
    a: "Canais de discussão são abertos a todos os membros. Canais oficiais (Comunicados, Benefícios, Cupons, Comece por aqui) são publicados apenas pela equipe; você pode ler e, quando permitido, comentar.",
  },
  {
    q: "Como ganho pontos?",
    a: "Publicando, comentando, recebendo curtidas, concluindo aulas e confirmando presença em eventos. Veja seu progresso no Ranking.",
  },
  {
    q: "Posso editar ou excluir minha publicação?",
    a: "Sim. Use o menu da própria publicação para editar ou excluir. Moderadores também podem moderar conteúdo.",
  },
  {
    q: "Onde tiro dúvidas?",
    a: "No canal Dúvidas gerais. Para assuntos institucionais, veja Benefícios e as Regras da comunidade.",
  },
];

export default function FaqPage() {
  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Perguntas frequentes</h1>
        <p className="text-sm text-muted-foreground">Respostas rápidas sobre a comunidade.</p>
      </div>
      <div className="space-y-3">
        {FAQ.map((item) => (
          <Collapsible key={item.q} title={item.q}>
            {item.a}
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
