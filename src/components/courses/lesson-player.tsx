"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { CheckCircle2 } from "lucide-react";
import { markLessonCompleteAction } from "@/server/actions/courses";
import { toast } from "sonner";

type Props = {
  lessonId: string;
  courseId: string;
  videoUrl: string | null;
  alreadyCompleted: boolean;
};

/*
 * MVP: player HTML5 simples.
 * Em produção considere Mux, Cloudflare Stream, Bunny Stream ou HLS próprio
 * para transcoding adaptativo, proteção de URL e analytics.
 */
export function LessonPlayer({ lessonId, courseId, videoUrl, alreadyCompleted }: Props) {
  const [completed, setCompleted] = React.useState(alreadyCompleted);
  const [pending, startTransition] = React.useTransition();

  function complete() {
    if (completed) return;
    startTransition(async () => {
      const res = await markLessonCompleteAction(lessonId, courseId);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao marcar conclusão.");
      } else {
        toast.success("Aula concluída · +15 pontos");
        setCompleted(true);
      }
    });
  }

  return (
    <div className="space-y-3">
      {videoUrl ? (
        <video
          src={videoUrl}
          controls
          className="aspect-video w-full rounded-lg bg-black"
          preload="metadata"
        />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-lg bg-muted text-sm text-muted-foreground">
          Esta aula não tem vídeo.
        </div>
      )}
      <div className="flex justify-end">
        <Button
          onClick={complete}
          disabled={completed || pending}
          className="gap-2"
          aria-label={completed ? "Aula concluída" : "Marcar aula como concluída"}
        >
          <CheckCircle2 className="h-4 w-4" />
          {completed ? "Aula concluída" : pending ? "Salvando…" : "Marcar como concluída"}
        </Button>
      </div>
    </div>
  );
}
