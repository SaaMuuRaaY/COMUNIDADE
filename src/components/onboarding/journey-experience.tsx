"use client";

import * as React from "react";
import Link from "next/link";
import { PlayCircle, ArrowRight } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { WelcomeVideoModal } from "@/components/onboarding/welcome-video-modal";
import { MenuTour } from "@/components/onboarding/menu-tour";

/**
 * Orquestra a etapa final da jornada em /comece-por-aqui:
 *   apresentação pendente → CTA "Fazer minha apresentação"
 *   apresentação feita + vídeo pendente → CTA primário "Assistir ao vídeo" (modal)
 *   essenciais prontos → tour inicia automaticamente
 *
 * Sem overlays simultâneos: o Dialog fecha primeiro e o tour só abre no FRAME
 * SEGUINTE (requestAnimationFrame).
 */
export function JourneyExperience({
  videoUrl,
  videoTitle,
  videoRequired,
  videoDone,
  introDone,
  essentialsDone,
}: {
  videoUrl: string;
  videoTitle: string;
  videoRequired: boolean;
  videoDone: boolean;
  introDone: boolean;
  essentialsDone: boolean;
}) {
  const [videoOpen, setVideoOpen] = React.useState(false);
  const [tourOpen, setTourOpen] = React.useState(false);
  const autoStarted = React.useRef(false);

  // Essenciais prontos e jornada ainda aberta (o pai só monta este componente nesse
  // caso): o tour é o passo que falta.
  React.useEffect(() => {
    if (!essentialsDone || autoStarted.current) return;
    autoStarted.current = true;
    const raf = requestAnimationFrame(() => setTourOpen(true));
    return () => cancelAnimationFrame(raf);
  }, [essentialsDone]);

  // Só é chamado depois que a action confirmou o vídeo assistido.
  function onVideoCompleted() {
    setVideoOpen(false);
    requestAnimationFrame(() => setTourOpen(true));
  }

  const showVideoCta = introDone && videoRequired && !videoDone;

  return (
    <>
      {!introDone ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Falta a sua apresentação</h2>
              <p className="text-sm text-muted-foreground">
                Publique sua apresentação para liberar os demais canais.
              </p>
            </div>
            <Button asChild className="shrink-0 gap-2">
              <Link href="/apresente-se">
                Fazer minha apresentação <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {showVideoCta ? (
        <Card>
          <CardContent className="flex flex-col gap-3 p-5 sm:flex-row sm:items-center sm:justify-between">
            <div>
              <h2 className="font-semibold">Assista ao vídeo de boas-vindas</h2>
              <p className="text-sm text-muted-foreground">
                Último passo antes de conhecermos as áreas do Portal.
              </p>
            </div>
            <Button className="shrink-0 gap-2" onClick={() => setVideoOpen(true)}>
              <PlayCircle className="h-4 w-4" /> Assistir ao vídeo
            </Button>
          </CardContent>
        </Card>
      ) : null}

      {videoRequired ? (
        <WelcomeVideoModal
          url={videoUrl}
          title={videoTitle}
          open={videoOpen}
          onOpenChange={setVideoOpen}
          onCompleted={onVideoCompleted}
        />
      ) : null}

      <MenuTour open={tourOpen} onClose={() => setTourOpen(false)} />
    </>
  );
}
