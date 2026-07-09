"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import Link from "next/link";
import { toast } from "sonner";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Checkbox } from "@/components/ui/checkbox";
import { Progress } from "@/components/ui/progress";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Collapsible } from "@/components/ui/collapsible";
import {
  AI_LEVELS,
  ONBOARDING_GOALS,
  ONBOARDING_INTERESTS,
  PARTICIPATION_GOALS,
} from "@/lib/config/onboarding";
import { AGREEMENTS, AGREEMENTS_VERSION } from "@/lib/config/agreements";
import { submitOnboardingAction } from "@/server/actions/onboarding";

type FormState = {
  ai_level: string;
  goals: string[];
  interests: string[];
  current_project: string;
  participation_goal: string;
};

const TOTAL_STEPS = 3;

export function OnboardingForm({
  initial,
  alreadyCompleted,
  acceptedVersion,
  next,
}: {
  initial: FormState;
  alreadyCompleted: boolean;
  acceptedVersion: string | null;
  next: string;
}) {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [step, setStep] = React.useState(0);
  const [form, setForm] = React.useState<FormState>(initial);
  const agreementsChanged = alreadyCompleted && acceptedVersion !== AGREEMENTS_VERSION;
  const [accepted, setAccepted] = React.useState(alreadyCompleted && !agreementsChanged);

  function toggle(key: "goals" | "interests", value: string) {
    setForm((f) => {
      const list = f[key];
      return {
        ...f,
        [key]: list.includes(value) ? list.filter((v) => v !== value) : [...list, value],
      };
    });
  }

  function nextStep() {
    if (step === 0) {
      if (!form.ai_level) return toast.error("Selecione seu nível.");
      if (form.goals.length === 0) return toast.error("Escolha ao menos 1 objetivo.");
    }
    if (step === 1) {
      if (!form.participation_goal) return toast.error("Selecione como quer participar.");
    }
    setStep((s) => Math.min(TOTAL_STEPS - 1, s + 1));
  }

  function submit() {
    if (!accepted) return toast.error("Aceite os acordos para continuar.");
    startTransition(async () => {
      const res = await submitOnboardingAction({
        ...form,
        current_project: form.current_project || null,
        agreements_accepted: accepted,
      });
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao salvar.");
        return;
      }
      toast.success("Tudo pronto! Bem-vindo(a).");
      // Segue para a jornada (checklist + convite); honra deep-link específico.
      const dest = next && !["/dashboard", "/community", "/"].includes(next) ? next : "/comece-por-aqui";
      router.push(dest);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-5 p-5">
        <div className="space-y-1.5">
          <p className="text-xs font-medium text-muted-foreground">
            Etapa {step + 1} de {TOTAL_STEPS}
          </p>
          <Progress value={((step + 1) / TOTAL_STEPS) * 100} />
        </div>

        {step === 0 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>Seu nível com IA</Label>
              <Select value={form.ai_level} onValueChange={(v) => setForm((f) => ({ ...f, ai_level: v }))}>
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {AI_LEVELS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
            <div className="space-y-2">
              <Label>Seus objetivos (1 ou mais)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ONBOARDING_GOALS.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox checked={form.goals.includes(o.value)} onCheckedChange={() => toggle("goals", o.value)} />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
            <div className="space-y-2">
              <Label>Interesses (opcional)</Label>
              <div className="grid gap-2 sm:grid-cols-2">
                {ONBOARDING_INTERESTS.map((o) => (
                  <label key={o.value} className="flex cursor-pointer items-center gap-2 text-sm">
                    <Checkbox
                      checked={form.interests.includes(o.value)}
                      onCheckedChange={() => toggle("interests", o.value)}
                    />
                    {o.label}
                  </label>
                ))}
              </div>
            </div>
          </div>
        ) : step === 1 ? (
          <div className="space-y-5">
            <div className="space-y-1.5">
              <Label>No que você está trabalhando? (opcional)</Label>
              <Textarea
                rows={2}
                maxLength={280}
                value={form.current_project}
                onChange={(e) => setForm((f) => ({ ...f, current_project: e.target.value }))}
                placeholder="Um projeto, meta ou desafio atual…"
              />
            </div>
            <div className="space-y-1.5">
              <Label>Como você quer participar?</Label>
              <Select
                value={form.participation_goal}
                onValueChange={(v) => setForm((f) => ({ ...f, participation_goal: v }))}
              >
                <SelectTrigger>
                  <SelectValue placeholder="Selecione…" />
                </SelectTrigger>
                <SelectContent>
                  {PARTICIPATION_GOALS.map((o) => (
                    <SelectItem key={o.value} value={o.value}>
                      {o.label}
                    </SelectItem>
                  ))}
                </SelectContent>
              </Select>
            </div>
          </div>
        ) : (
          <div className="space-y-2">
            <Label>Acordos</Label>
            {agreementsChanged ? (
              <p className="rounded-md border border-[var(--accent-line)] bg-muted/50 px-3 py-2 text-xs text-muted-foreground">
                Os acordos foram atualizados (versão {AGREEMENTS_VERSION}). Revise e aceite novamente
                antes de salvar.
              </p>
            ) : null}
            {AGREEMENTS.map((a) => (
              <Collapsible key={a.key} title={a.label}>
                Leia o documento completo em{" "}
                <Link href={a.href} target="_blank" className="text-primary underline-offset-2 hover:underline">
                  {a.label}
                </Link>
                .
              </Collapsible>
            ))}
            <label className="flex cursor-pointer items-start gap-2 pt-1 text-sm">
              <Checkbox checked={accepted} onCheckedChange={(c) => setAccepted(c === true)} className="mt-0.5" />
              <span>
                Li e aceito os Termos de Uso, a Política de Privacidade e as Regras da Comunidade (versão{" "}
                {AGREEMENTS_VERSION}).
              </span>
            </label>
          </div>
        )}

        <div className="flex items-center justify-between gap-2">
          {step === 0 ? (
            <Button variant="ghost" onClick={() => router.push(next)}>
              Continuar depois
            </Button>
          ) : (
            <Button variant="ghost" onClick={() => setStep((s) => s - 1)} disabled={pending}>
              Voltar
            </Button>
          )}
          {step < TOTAL_STEPS - 1 ? (
            <Button onClick={nextStep}>Avançar</Button>
          ) : (
            <Button onClick={submit} disabled={pending}>
              {pending ? "Salvando…" : alreadyCompleted ? "Salvar" : "Concluir"}
            </Button>
          )}
        </div>
      </CardContent>
    </Card>
  );
}
