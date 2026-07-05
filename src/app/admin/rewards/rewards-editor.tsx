"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { setMonthlyWinnersAction } from "@/server/actions/rewards";

type Candidate = { id: string; name: string; points: number };

const MEDALS = ["🥇", "🥈", "🥉"];

export function RewardsEditor({
  month,
  candidates,
  initial,
}: {
  month: string;
  candidates: Candidate[];
  initial: { rank: number; userId: string }[];
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();

  const initMap: Record<number, string> = { 1: "", 2: "", 3: "" };
  initial.forEach((w) => {
    initMap[w.rank] = w.userId;
  });
  const [sel, setSel] = React.useState<Record<number, string>>(initMap);

  function submit() {
    const winners = [1, 2, 3].filter((r) => sel[r]).map((r) => ({ rank: r, userId: sel[r] }));
    if (winners.length === 0) return toast.error("Selecione ao menos 1 vencedor.");
    if (new Set(winners.map((w) => w.userId)).size !== winners.length) {
      return toast.error("Um mesmo membro não pode ocupar duas posições.");
    }
    startTransition(async () => {
      const res = await setMonthlyWinnersAction(month, winners);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao salvar.");
        return;
      }
      toast.success("Vencedores do mês confirmados.");
      router.refresh();
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        {candidates.length === 0 ? (
          <p className="text-sm text-muted-foreground">
            Ninguém pontuou neste mês ainda — sem candidatos para premiar.
          </p>
        ) : (
          <>
            {[1, 2, 3].map((rank) => (
              <div key={rank} className="space-y-1.5">
                <Label>
                  {MEDALS[rank - 1]} {rank}º lugar
                </Label>
                <Select
                  value={sel[rank] || "none"}
                  onValueChange={(v) => setSel((s) => ({ ...s, [rank]: v === "none" ? "" : v }))}
                >
                  <SelectTrigger>
                    <SelectValue placeholder="Selecionar…" />
                  </SelectTrigger>
                  <SelectContent>
                    <SelectItem value="none">— ninguém —</SelectItem>
                    {candidates.map((c) => (
                      <SelectItem key={c.id} value={c.id}>
                        {c.name} · {c.points} pts
                      </SelectItem>
                    ))}
                  </SelectContent>
                </Select>
              </div>
            ))}
            <div className="flex justify-end">
              <Button onClick={submit} disabled={pending}>
                {pending ? "Salvando…" : "Confirmar vencedores"}
              </Button>
            </div>
          </>
        )}
      </CardContent>
    </Card>
  );
}
