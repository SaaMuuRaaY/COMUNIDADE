"use client";

import { useEffect } from "react";
import { Button } from "@/components/ui/button";

export default function AppError({
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
      <h1 className="text-xl font-semibold">Ops, algo falhou</h1>
      <p className="text-sm text-muted-foreground">Não conseguimos carregar esta página.</p>
      <Button onClick={reset}>Tentar novamente</Button>
    </div>
  );
}
