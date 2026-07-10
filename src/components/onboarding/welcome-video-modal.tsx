"use client";

import * as React from "react";
import { Check, Loader2 } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogTitle } from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { loadYouTubeApi, type YTPlayer } from "@/lib/video/load-youtube-api";
import { parseYouTubeId, youTubeEmbedUrl } from "@/lib/video/youtube";
import { markWelcomeVideoWatchedAction } from "@/server/actions/onboarding";

/**
 * Vídeo de boas-vindas em modal imersivo (~90% da largura, 16:9, sem fullscreen
 * forçado, sem autoplay). Detecta o fim pelo player (YT.PlayerState.ENDED) e mantém
 * SEMPRE o fallback "Marcar como assistido" — se a API for bloqueada (CSP, extensão,
 * rede), a jornada não trava.
 *
 * Invariantes:
 *  - `completingRef` impede que ENDED e o botão manual concluam simultaneamente;
 *  - a conclusão NUNCA é marcada só no client: o modal só fecha (e o tour só começa)
 *    depois que `markWelcomeVideoWatchedAction()` retorna sucesso;
 *  - em falha: modal permanece aberto, erro visível, nova tentativa permitida;
 *  - no unmount/fechamento: `player.destroy()` e guarda contra update pós-unmount.
 */
export function WelcomeVideoModal({
  url,
  title,
  open,
  onOpenChange,
  onCompleted,
}: {
  url: string;
  title: string;
  open: boolean;
  onOpenChange: (open: boolean) => void;
  /** Chamado só após a action confirmar. O pai fecha o Dialog e agenda o tour. */
  onCompleted: () => void;
}) {
  const iframeRef = React.useRef<HTMLIFrameElement | null>(null);
  const playerRef = React.useRef<YTPlayer | null>(null);
  const completingRef = React.useRef(false);
  const mountedRef = React.useRef(true);

  const [saving, setSaving] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  React.useEffect(() => {
    mountedRef.current = true;
    return () => {
      mountedRef.current = false;
    };
  }, []);

  const videoId = React.useMemo(() => parseYouTubeId(url), [url]);
  const src = React.useMemo(() => {
    if (!videoId) return null;
    const origin = typeof window !== "undefined" ? window.location.origin : undefined;
    return youTubeEmbedUrl(videoId, { jsApi: true, origin });
  }, [videoId]);

  const complete = React.useCallback(async () => {
    if (completingRef.current) return;
    completingRef.current = true;
    setError(null);
    setSaving(true);

    const res = await markWelcomeVideoWatchedAction();
    if (!mountedRef.current) return;
    setSaving(false);

    if (!res.ok) {
      // Nunca marca no client. Reabre a possibilidade de tentar de novo.
      completingRef.current = false;
      setError(res.error ?? "Não foi possível salvar. Tente novamente.");
      return;
    }
    onCompleted();
  }, [onCompleted]);

  // Anexa a API ao iframe existente (mantém nocookie + sandbox). Só quando aberto.
  React.useEffect(() => {
    if (!open || !src) return;
    let cancelled = false;

    loadYouTubeApi()
      .then((YT) => {
        if (cancelled || !iframeRef.current) return;
        playerRef.current = new YT.Player(iframeRef.current, {
          host: "https://www.youtube-nocookie.com",
          events: {
            onStateChange: (e) => {
              if (e.data === YT.PlayerState.ENDED) void complete();
            },
          },
        });
      })
      .catch(() => {
        /* API indisponível (CSP/extensão/rede): o fallback manual cobre. */
      });

    return () => {
      cancelled = true;
      try {
        playerRef.current?.destroy();
      } catch {
        /* player já destruído pelo próprio YouTube */
      }
      playerRef.current = null;
    };
  }, [open, src, complete]);

  return (
    <Dialog open={open} onOpenChange={(o) => !saving && onOpenChange(o)}>
      <DialogContent className="max-h-[85vh] w-[90vw] max-w-[90vw] overflow-y-auto p-4 sm:p-6">
        <DialogTitle>{title}</DialogTitle>
        <DialogDescription className="sr-only">
          Vídeo de boas-vindas do Portal Nexus. Ao terminar, o passo é concluído
          automaticamente; você também pode marcar manualmente.
        </DialogDescription>

        {src ? (
          <div className="aspect-video w-full overflow-hidden rounded-md border">
            <iframe
              ref={iframeRef}
              src={src}
              title={title}
              className="h-full w-full"
              sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
              referrerPolicy="strict-origin-when-cross-origin"
              allow="encrypted-media; picture-in-picture; fullscreen"
              allowFullScreen
            />
          </div>
        ) : (
          <div className="flex aspect-video w-full items-center justify-center rounded-md border bg-muted/40">
            <p className="text-sm text-muted-foreground">Vídeo indisponível.</p>
          </div>
        )}

        {error ? <p className="text-sm text-destructive">{error}</p> : null}

        <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between">
          <p className="text-xs text-muted-foreground">
            Ao terminar o vídeo, o passo é concluído sozinho.
          </p>
          <Button variant="outline" onClick={() => void complete()} disabled={saving}>
            {saving ? (
              <>
                <Loader2 className="mr-2 h-4 w-4 animate-spin" /> Salvando…
              </>
            ) : (
              <>
                <Check className="mr-2 h-4 w-4" /> Marcar como assistido
              </>
            )}
          </Button>
        </div>
      </DialogContent>
    </Dialog>
  );
}
