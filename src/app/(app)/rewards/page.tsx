import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Collapsible } from "@/components/ui/collapsible";
import { requireProfile } from "@/lib/auth/current-user";
import { getRewardWinners } from "@/server/queries/rewards";

export const metadata = { title: "Recompensas" };

const MEDALS = ["🥇", "🥈", "🥉"];

const RULES = [
  {
    q: "Como ganho pontos?",
    a: "Publicando (10 pts), comentando (5), recebendo curtidas (2), concluindo aulas (15) e confirmando presença em eventos (20).",
  },
  {
    q: "Como é o ranking do mês?",
    a: "Contam apenas os pontos ganhos no mês corrente. Acompanhe ao vivo em Ranking → Este mês.",
  },
  {
    q: "Conteúdo apagado conta pontos?",
    a: "Não. Se você apagar um post ou comentário, os pontos daquele conteúdo são estornados — o ranking reflete só o que continua no ar.",
  },
  {
    q: "Como os vencedores são escolhidos?",
    a: "A equipe reconhece manualmente os primeiros colocados do mês. A entrega do prêmio é combinada à parte.",
  },
];

export default async function RewardsPage() {
  await requireProfile();
  const winners = await getRewardWinners();

  return (
    <div className="mx-auto max-w-3xl space-y-6 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recompensas do mês</h1>
        <p className="text-sm text-muted-foreground">
          Os membros mais ativos, reconhecidos todo mês.
        </p>
      </div>

      {winners.length === 0 ? (
        <Card>
          <CardContent className="p-6 text-center text-sm text-muted-foreground">
            Os vencedores ainda não foram anunciados. Participe e apareça no{" "}
            <Link href="/leaderboard?period=month" className="text-primary underline-offset-2 hover:underline">
              ranking do mês
            </Link>
            .
          </CardContent>
        </Card>
      ) : (
        <Card>
          <CardContent className="divide-y p-0">
            {winners.map((w) => (
              <div key={w.user_id} className="flex items-center gap-3 p-4">
                <span className="w-8 text-center text-2xl">{MEDALS[w.rank - 1] ?? "🏅"}</span>
                <UserAvatar name={w.full_name} src={w.avatar_url} className="h-10 w-10" />
                <Link
                  href={`/members/${w.user_id}`}
                  className="min-w-0 flex-1 truncate font-medium hover:underline"
                >
                  {w.full_name ?? "Membro"}
                </Link>
                <span className="text-sm text-muted-foreground">{w.rank}º lugar</span>
              </div>
            ))}
          </CardContent>
        </Card>
      )}

      <div className="space-y-2">
        <h2 className="text-lg font-semibold">Como funciona</h2>
        {RULES.map((r) => (
          <Collapsible key={r.q} title={r.q}>
            {r.a}
          </Collapsible>
        ))}
      </div>
    </div>
  );
}
