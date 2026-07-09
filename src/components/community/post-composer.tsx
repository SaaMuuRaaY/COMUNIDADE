"use client";

import * as React from "react";
import { Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Label } from "@/components/ui/label";
import { Markdown } from "@/components/shared/markdown";
import { createPostAction } from "@/server/actions/posts";
import { PostImageField } from "@/components/community/post-image-field";
import { PostVideoField } from "@/components/community/post-video-field";
import { toast } from "sonner";

export function PostComposer({
  currentUserId,
  channelSlug,
  channels,
  actionLabel,
  placeholder,
  guidance,
  initialBody,
  initialOpen,
}: {
  currentUserId: string;
  /** Canal fixo (uso por canal). Omitido no feed geral, onde `channels` decide. */
  channelSlug?: string;
  /** Lista de canais para escolher (uso no feed geral). O servidor revalida a permissão. */
  channels?: { slug: string; label: string }[];
  actionLabel?: string;
  placeholder?: string;
  guidance?: string;
  /** Rascunho inicial do corpo (ex.: apresentação pré-preenchida a partir do onboarding). */
  initialBody?: string;
  /** Abre o composer já expandido (ex.: passo de apresentação da jornada). */
  initialOpen?: boolean;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState(initialBody ?? "");
  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);
  const [mediaType, setMediaType] = React.useState<string | null>(null);
  const [selectedSlug, setSelectedSlug] = React.useState(channelSlug ?? channels?.[0]?.slug ?? "");
  const [open, setOpen] = React.useState(initialOpen ?? false);
  const [pending, startTransition] = React.useTransition();

  // Canal efetivo: fixo (por canal) ou o escolhido no seletor (feed geral).
  const category = channelSlug ?? selectedSlug;

  function submit() {
    if (!category) {
      toast.error("Escolha um canal.");
      return;
    }
    if (body.trim().length < 2) {
      toast.error("Conteúdo muito curto.");
      return;
    }
    const fd = new FormData();
    fd.append("category", category);
    fd.append("title", title);
    fd.append("body", body);
    if (mediaUrl) {
      fd.append("media_url", mediaUrl);
      if (mediaType) fd.append("media_type", mediaType);
    }
    startTransition(async () => {
      const res = await createPostAction(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao publicar.");
        return;
      }
      toast.success("Publicação criada.");
      setTitle("");
      setBody("");
      setMediaUrl(null);
      setMediaType(null);
      setOpen(false);
    });
  }

  if (!open) {
    return (
      <div className="flex justify-end">
        <Button onClick={() => setOpen(true)} size="sm" className="gap-2">
          <Plus className="h-4 w-4" />
          {actionLabel ?? "Criar publicação"}
        </Button>
      </div>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {channels && !channelSlug ? (
          <div className="space-y-1.5">
            <Label htmlFor="composer-channel">Canal</Label>
            <Select value={selectedSlug} onValueChange={setSelectedSlug}>
              <SelectTrigger id="composer-channel">
                <SelectValue placeholder="Escolha um canal" />
              </SelectTrigger>
              <SelectContent>
                {channels.map((c) => (
                  <SelectItem key={c.slug} value={c.slug}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        ) : null}
        {guidance ? <p className="text-xs text-muted-foreground">{guidance}</p> : null}
        <Input
          placeholder="Título (opcional)"
          aria-label="Título da publicação"
          value={title}
          onChange={(e) => setTitle(e.target.value)}
          maxLength={160}
        />

        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Escrever</TabsTrigger>
            <TabsTrigger value="preview">Pré-visualizar</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              rows={6}
              placeholder={placeholder ?? "Escreva em Markdown — **negrito**, _itálico_, listas, [links](#)…"}
              aria-label="Conteúdo da publicação"
              value={body}
              onChange={(e) => setBody(e.target.value)}
            />
          </TabsContent>
          <TabsContent value="preview">
            <div className="min-h-[160px] rounded-md border p-3">
              {body.trim() ? <Markdown>{body}</Markdown> : <p className="text-sm text-muted-foreground">Nada para pré-visualizar.</p>}
            </div>
          </TabsContent>
        </Tabs>

        {/* Um slot de mídia por post: imagem OU vídeo do YouTube (mutuamente exclusivos). */}
        {mediaType !== "youtube" ? (
          <PostImageField
            userId={currentUserId}
            value={mediaUrl}
            onChange={(url, type) => {
              setMediaUrl(url);
              setMediaType(type);
            }}
          />
        ) : null}
        {!(mediaUrl && mediaType !== "youtube") ? (
          <PostVideoField
            value={mediaType === "youtube" ? mediaUrl : null}
            onChange={(url) => {
              setMediaUrl(url);
              setMediaType(url ? "youtube" : null);
            }}
          />
        ) : null}

        <div className="flex items-center justify-end gap-2">
          <Button variant="ghost" onClick={() => setOpen(false)} disabled={pending}>
            Cancelar
          </Button>
          <Button onClick={submit} disabled={pending}>
            {pending ? "Publicando…" : "Publicar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
