"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Check } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { YouTubeVideoEmbed } from "@/components/shared/youtube-video-embed";
import { markWelcomeVideoWatchedAction } from "@/server/actions/onboarding";
import { toast } from "sonner";

/**
 * Passo "Assistir ao vídeo de boas-vindas" da jornada. Sem detecção automática de
 * fim (nocookie+CSP+sandbox a tornam frágil): o membro clica "Marcar como assistido",
 * que grava `welcome_video_completed_at` e revela o CTA "Fazer minha apresentação".
 */
export function WelcomeVideoStep({
  url,
  title,
  watched,
}: {
  url: string;
  title: string;
  watched: boolean;
}) {
  const router = useRouter();
  const [done, setDone] = React.useState(watched);
  const [pending, startTransition] = React.useTransition();

  function markWatched() {
    startTransition(async () => {
      const res = await markWelcomeVideoWatchedAction();
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao salvar.");
        return;
      }
      setDone(true);
      toast.success("Vídeo marcado como assistido.");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <h2 className="font-semibold">Vídeo de boas-vindas</h2>
        <YouTubeVideoEmbed url={url} title={title} showUnavailable />
        {done ? (
          <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
            <span className="flex items-center gap-2 text-sm text-muted-foreground">
              <Check className="h-4 w-4 text-[var(--accent)]" /> Vídeo assistido
            </span>
            <Button onClick={() => router.push("/apresente-se")}>Fazer minha apresentação</Button>
          </div>
        ) : (
          <Button variant="outline" onClick={markWatched} disabled={pending}>
            {pending ? "Salvando…" : "Marcar como assistido"}
          </Button>
        )}
      </CardContent>
    </Card>
  );
}
