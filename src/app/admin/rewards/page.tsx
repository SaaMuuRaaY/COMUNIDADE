import { requireAdmin } from "@/lib/auth/current-user";
import { getMonthlyRanking, getRewardWinners, currentMonthStart } from "@/server/queries/rewards";
import { RewardsEditor } from "./rewards-editor";

export const metadata = { title: "Recompensas · Admin" };

export default async function AdminRewardsPage() {
  await requireAdmin();
  const month = currentMonthStart();
  const [ranking, winners] = await Promise.all([getMonthlyRanking(20), getRewardWinners(month)]);

  return (
    <div className="mx-auto max-w-3xl space-y-4 p-4 md:p-6">
      <div>
        <h1 className="text-2xl font-semibold tracking-tight">Recompensas do mês</h1>
        <p className="text-sm text-muted-foreground">
          Selecione manualmente os vencedores do mês corrente ({month}) a partir do ranking. A
          entrega do prêmio é combinada à parte (esta tela apenas registra e destaca os vencedores).
        </p>
      </div>
      <RewardsEditor
        month={month}
        candidates={ranking.map((r) => ({
          id: r.user_id,
          name: r.full_name ?? "Membro",
          points: r.monthly_points,
        }))}
        initial={winners.map((w) => ({ rank: w.rank, userId: w.user_id }))}
      />
    </div>
  );
}
