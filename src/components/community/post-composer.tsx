"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Markdown } from "@/components/shared/markdown";
import { createPostAction } from "@/server/actions/posts";
import { PostImageField } from "@/components/community/post-image-field";
import { toast } from "sonner";

export function PostComposer({
  currentUserId,
  channelSlug,
  actionLabel,
  placeholder,
  guidance,
}: {
  currentUserId: string;
  channelSlug: string;
  actionLabel?: string;
  placeholder?: string;
  guidance?: string;
}) {
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [mediaUrl, setMediaUrl] = React.useState<string | null>(null);
  const [mediaType, setMediaType] = React.useState<string | null>(null);
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function submit() {
    if (body.trim().length < 2) {
      toast.error("Conteúdo muito curto.");
      return;
    }
    const fd = new FormData();
    fd.append("category", channelSlug);
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
      <Card>
        <CardContent className="p-4">
          <button
            onClick={() => setOpen(true)}
            className="w-full rounded-md border bg-muted/40 px-4 py-3 text-left text-sm text-muted-foreground hover:bg-muted"
          >
            {actionLabel ?? "O que está acontecendo? Compartilhe com a comunidade…"}
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        {guidance ? <p className="text-xs text-muted-foreground">{guidance}</p> : null}
        <Input
          placeholder="Título (opcional)"
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

        <PostImageField
          userId={currentUserId}
          value={mediaUrl}
          onChange={(url, type) => {
            setMediaUrl(url);
            setMediaType(type);
          }}
        />

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
