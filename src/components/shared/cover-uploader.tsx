"use client";

import * as React from "react";
import { Upload, Loader2, X } from "lucide-react";
import { useImageUpload } from "@/lib/storage/use-image-upload";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

const COVER_MAX_BYTES = 2 * 1024 * 1024;

/**
 * Upload de CAPA (16:9) para o bucket `content-covers` (recursos/apps). Controlado:
 * devolve a URL pública por `onChange`; a persistência fica com o "Salvar" do form.
 * Reusa `useImageUpload` (mesma lógica do avatar/post). RLS = is_moderator (path livre).
 */
export function CoverUploader({
  value,
  onChange,
}: {
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { uploading, error, upload } = useImageUpload("content-covers", { maxBytes: COVER_MAX_BYTES });
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [showUrl, setShowUrl] = React.useState(false);

  async function handleFile(file: File) {
    const objUrl = URL.createObjectURL(file);
    setLocalPreview(objUrl);
    const res = await upload("content", file);
    URL.revokeObjectURL(objUrl);
    setLocalPreview(null);
    if (res) onChange(res.url);
  }

  const preview = localPreview ?? value;

  return (
    <div className="space-y-2">
      <Label>Capa (opcional · 16:9 · até 2MB)</Label>
      {preview ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img src={preview} alt="Capa" className="aspect-video w-full rounded-md border object-cover" />
      ) : (
        <div className="flex aspect-video w-full items-center justify-center rounded-md border border-dashed text-xs text-muted-foreground">
          Sem capa
        </div>
      )}
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
      <div className="flex gap-2">
        <Button
          type="button"
          variant="outline"
          size="sm"
          disabled={uploading}
          onClick={() => inputRef.current?.click()}
          className="gap-2"
        >
          {uploading ? <Loader2 className="h-4 w-4 animate-spin" /> : <Upload className="h-4 w-4" />}
          {uploading ? "Enviando…" : value ? "Trocar capa" : "Enviar capa"}
        </Button>
        {value ? (
          <Button
            type="button"
            variant="ghost"
            size="sm"
            disabled={uploading}
            onClick={() => onChange(null)}
            className="gap-1 text-muted-foreground"
          >
            <X className="h-4 w-4" /> Remover
          </Button>
        ) : null}
      </div>
      {error ? <p className="text-xs text-destructive">{error}</p> : null}
      <button
        type="button"
        onClick={() => setShowUrl((s) => !s)}
        className="text-xs text-muted-foreground underline-offset-2 hover:underline"
      >
        {showUrl ? "Ocultar URL manual" : "Usar URL manual (avançado)"}
      </button>
      {showUrl ? (
        <Input value={value ?? ""} placeholder="https://…" onChange={(e) => onChange(e.target.value || null)} />
      ) : null}
    </div>
  );
}
