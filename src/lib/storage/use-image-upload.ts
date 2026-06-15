"use client";

import * as React from "react";
import { createClient } from "@/lib/supabase/client";
import { safeStoragePath } from "@/lib/storage/upload";

export type UploadResult = { url: string; type: string };

/**
 * Hook compartilhado de upload de imagem para o Supabase Storage (browser client).
 * Fonte ÚNICA da lógica de upload — usada pelo avatar e pela imagem de post.
 * Valida (image/* + tamanho), sobe no bucket via `safeStoragePath` (path `<uid>/...`
 * que casa com a RLS owner-por-userId dos buckets) e devolve a URL pública + mime.
 * Não persiste em tabela nem altera policies — isso fica a cargo de quem chama.
 */
export function useImageUpload(bucketId: string, opts?: { maxBytes?: number }) {
  const maxBytes = opts?.maxBytes ?? 5 * 1024 * 1024;
  const [uploading, setUploading] = React.useState(false);
  const [error, setError] = React.useState<string | null>(null);

  const upload = React.useCallback(
    async (userId: string, file: File): Promise<UploadResult | null> => {
      setError(null);
      if (!file.type.startsWith("image/")) {
        setError("Selecione uma imagem (PNG, JPG, WEBP ou GIF).");
        return null;
      }
      if (file.size > maxBytes) {
        setError(`Imagem muito grande (máximo ${Math.round(maxBytes / 1024 / 1024)}MB).`);
        return null;
      }
      setUploading(true);
      try {
        const supabase = createClient();
        const path = safeStoragePath(userId, file.name);
        const { error: upErr } = await supabase.storage
          .from(bucketId)
          .upload(path, file, { cacheControl: "3600", upsert: true, contentType: file.type });
        if (upErr) {
          setError(`Falha no upload: ${upErr.message}`);
          return null;
        }
        const { data } = supabase.storage.from(bucketId).getPublicUrl(path);
        return { url: data.publicUrl, type: file.type };
      } catch {
        setError("Erro inesperado no upload. Tente novamente.");
        return null;
      } finally {
        setUploading(false);
      }
    },
    [bucketId, maxBytes],
  );

  return { uploading, error, setError, upload };
}
