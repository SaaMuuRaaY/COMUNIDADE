"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-xl font-semibold">Erro no painel admin</h1>
      <p className="text-sm text-muted-foreground">Algo falhou ao carregar esta tela.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
