"use client";

import * as React from "react";
import { Video, X } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { YouTubeVideoEmbed } from "@/components/shared/youtube-video-embed";
import { isYouTubeUrl } from "@/lib/video/youtube";

/**
 * Campo de vídeo do YouTube para o compositor de post — irmão do PostImageField.
 * Vídeo é URL externa (não upload): valida com isYouTubeUrl e devolve a URL por
 * `onChange`. O composer seta media_type='youtube'. Imagem e vídeo são mutuamente
 * exclusivos (um slot de mídia por post) — o composer decide qual campo mostrar.
 */
export function PostVideoField({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const [draft, setDraft] = React.useState(value ?? "");
  const trimmed = draft.trim();
  const valid = isYouTubeUrl(trimmed);

  if (value) {
    return (
      <div className="space-y-2">
        <YouTubeVideoEmbed url={value} title="Prévia do vídeo" showUnavailable />
        <Button
          type="button"
          variant="secondary"
          size="sm"
          onClick={() => {
            onChange(null);
            setDraft("");
          }}
          className="gap-1"
        >
          <X className="h-4 w-4" /> Remover vídeo
        </Button>
      </div>
    );
  }

  return (
    <div className="space-y-1.5">
      <div className="flex gap-2">
        <Input
          value={draft}
          onChange={(e) => setDraft(e.target.value)}
          placeholder="Vídeo do YouTube — cole a URL (opcional)"
          aria-label="URL do vídeo do YouTube"
          inputMode="url"
        />
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={!valid}
          onClick={() => onChange(trimmed)}
          className="shrink-0 gap-1"
        >
          <Video className="h-4 w-4" /> Adicionar
        </Button>
      </div>
      {trimmed && !valid ? (
        <p className="text-xs text-destructive">URL do YouTube inválida.</p>
      ) : null}
    </div>
  );
}
