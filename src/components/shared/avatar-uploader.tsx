"use client";

import * as React from "react";
import { Upload, Loader2, X } from "lucide-react";
import { useImageUpload } from "@/lib/storage/use-image-upload";
import { AVATAR_MAX_BYTES } from "@/lib/constants";
import { UserAvatar } from "@/components/shared/user-avatar";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";

/**
 * Upload de avatar para o bucket `avatars` (Supabase Storage) via browser client.
 * Componente CONTROLADO: ao concluir o upload, devolve a URL pública por `onChange`.
 * A persistência em `profiles.avatar_url` continua sendo feita pelo "Salvar" do
 * formulário de perfil (mesma action existente) — não duplica lógica de save.
 * A lógica de upload vem do hook compartilhado `useImageUpload` (mesma do post).
 */
export function AvatarUploader({
  userId,
  name,
  value,
  onChange,
}: {
  userId: string;
  name: string | null;
  value: string | null;
  onChange: (url: string | null) => void;
}) {
  const inputRef = React.useRef<HTMLInputElement>(null);
  const { uploading, error, upload } = useImageUpload("avatars", { maxBytes: AVATAR_MAX_BYTES });
  const [localPreview, setLocalPreview] = React.useState<string | null>(null);
  const [showUrl, setShowUrl] = React.useState(false);

  async function handleFile(file: File) {
    const objUrl = URL.createObjectURL(file);
    setLocalPreview(objUrl);
    const res = await upload(userId, file);
    URL.revokeObjectURL(objUrl);
    setLocalPreview(null);
    if (res) onChange(res.url);
  }

  const preview = localPreview ?? value;

  return (
    <div className="space-y-3">
      <Label>Avatar</Label>
      <div className="flex items-center gap-4">
        <UserAvatar name={name} src={preview} className="h-16 w-16 ring-1 ring-border" />
        <div className="flex flex-col gap-2">
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
              {uploading ? "Enviando…" : value ? "Trocar imagem" : "Enviar imagem"}
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
          <p className="text-xs text-muted-foreground">
            PNG, JPG, WEBP ou GIF · até 5MB. Salvo ao clicar em <strong>Salvar alterações</strong>.
          </p>
        </div>
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
        <Input
          value={value ?? ""}
          placeholder="https://…"
          onChange={(e) => onChange(e.target.value || null)}
        />
      ) : null}
    </div>
  );
}
