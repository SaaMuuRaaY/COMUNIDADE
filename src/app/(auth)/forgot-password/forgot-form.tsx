"use client";

import { useActionState } from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { forgotPasswordAction, type ActionState } from "@/server/actions/auth";

const initial: ActionState = { ok: false };

export function ForgotForm() {
  const [state, action, pending] = useActionState(forgotPasswordAction, initial);

  if (state?.ok) {
    return (
      <p className="rounded-md border bg-muted/50 p-4 text-sm">
        Se este e-mail estiver cadastrado, enviamos um link para redefinir sua senha. Confira sua caixa de entrada.
      </p>
    );
  }

  return (
    <form action={action} className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="email">E-mail</Label>
        <Input id="email" name="email" type="email" required autoComplete="email" />
      </div>
      {state?.error ? <p className="text-sm text-destructive">{state.error}</p> : null}
      <Button type="submit" className="w-full" disabled={pending}>
        {pending ? "Enviando…" : "Enviar link de recuperação"}
      </Button>
    </form>
  );
}
