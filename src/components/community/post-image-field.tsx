"use client";

import * as React from "react";
import { ImageIcon, Loader2, X } from "lucide-react";
import { useImageUpload } from "@/lib/storage/use-image-upload";
import { POST_IMAGE_MAX_BYTES } from "@/lib/constants";
import { Button } from "@/components/ui/button";

/**
 * Campo de imagem para o compositor de post. Sobe no bucket `post-media` via o
 * hook compartilhado e devolve URL pública + mime por `onChange`. Controlado:
 * a persistência fica com o `createPostAction` (que já lê media_url/media_type).
 */
export function PostImageField({
  userId,
  value,
  onChange,
}: {
  userId: string;
  value: string | null;
  onChange: (url: string | null, type: string | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { uploading, error, upload } = useImageUpload("post-media", { maxBytes: POST_IMAGE_MAX_BYTES });
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);

  async function handleFile(file: File) {
    const objUrl = URL.createObjectURL(file);
    setLocalPreview(objUrl);
    const res = await upload(userId, file);
    URL.revokeObjectURL(objUrl);
    setLocalPreview(null);
    if (res) onChange(res.url, res.type);
  }

  const preview = localPreview ?? value;

  return (
    <div className="space-y-2">
      <input
        ref={inputRef}
        type="file"
        accept="image/*"
        className="hidden"
        onChange={(e) => {
          const f = e.target.files?.[0];
          if (f) void handleFile(f);
          e.target.value = "";
        }}
      />

      {preview ? (
        <div className="relative overflow-hidden rounded-md border">
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={preview} alt="Prévia da imagem da publicação" className="max-h-72 w-full object-cover" />
          {uploading ? (
            <div className="absolute inset-0 grid place-items-center bg-background/60">
              <Loader2 className="h-5 w-5 animate-spin" />
            </div>
          ) : (
            <Button
              type="button"
              variant="secondary"
              size="sm"
              onClick={() => onChange(null, null)}
              className="absolute right-2 top-2 gap-1"
            >
              <X className="h-4 w-4" /> Remover
            </Button>
          )}
        </div>
      ) : (
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <ImageIcon className="h-4 w-4" />}
          {uploading ? "Enviando…" : "Adicionar imagem"}
        </Button>
      )}

      {error ? <p className="text-xs text-destructive">{error}</p> : null}
    </div>
  );
}
