"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { registerAction, type ActionState } from "@/server/actions/auth";

const initial: ActionState = { ok: false };

export function RegisterForm({ next }: { next?: string }) {
  const [state, action, pending] = useActionState(registerAction, initial);

  if (state?.pending) {
    return (
      <div className="space-y-2 rounded-md border border-success/30 bg-success/10 p-4 text-sm">
        <p className="font-medium text-success">Conta criada! 🎉</p>
        <p className="text-muted-foreground">
          Enviamos um e-mail de confirmação. Confira sua caixa de entrada (e o spam) e clique no
          link para ativar seu acesso.
        </p>
      </div>
    );
  }

  return (
    <form action={action} className="space-y-4">
      {next ? <input type="hidden" name="next" value={next} /> : null}
      <div className="space-y-2">
        <Label htmlFor="full_name">Seu nome</Label>
        <Input id="full_name" name="full_name" required placeholder="Como podemos te chamar?" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      <div className="space-y-2">
        <Label htmlFor="password">Senha</Label>
        <Input id="password" name="password" type="password" required minLength={8} autoComplete="new-password" />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Criando conta…" : "Criar conta"}
      </Button>
    </form>
  );
}
