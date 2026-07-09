import { cn } from "@/lib/utils";
import { parseYouTubeId, youTubeEmbedUrl } from "@/lib/video/youtube";

/**
 * Player do YouTube por URL. Sem "use client" nem "server-only": serve tanto a
 * pagina (Server Component) quanto o preview do formulario admin (client).
 *
 * `allow-same-origin` no sandbox e necessario para o player (storage/postMessage
 * proprios). E seguro porque o frame e cross-origin: a ressalva de "o frame
 * remove o proprio sandbox" so vale para frames de mesma origem. O controle
 * real de destino continua sendo o `frame-src` da CSP.
 */
export function YouTubeVideoEmbed({
  url,
  title,
  className,
  showUnavailable = false,
}: {
  url: string | null | undefined;
  title: string;
  className?: string;
  showUnavailable?: boolean;
}) {
  const id = url ? parseYouTubeId(url) : null;

  if (!id) {
    if (!showUnavailable) return null;
    return (
      <div
        className={cn(
          "flex aspect-video w-full items-center justify-center rounded-md border bg-muted/40",
          className,
        )}
      >
        <p className="text-sm text-muted-foreground">Vídeo indisponível.</p>
      </div>
    );
  }

  return (
    <iframe
      src={youTubeEmbedUrl(id)}
      title={title}
      loading="lazy"
      className={cn("aspect-video w-full rounded-md border", className)}
      sandbox="allow-scripts allow-same-origin allow-popups allow-presentation"
      referrerPolicy="strict-origin-when-cross-origin"
      allow="encrypted-media; picture-in-picture; fullscreen"
      allowFullScreen
    />
  );
}
