"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Tabs, TabsList, TabsTrigger, TabsContent } from "@/components/ui/tabs";
import { Markdown } from "@/components/shared/markdown";
import { POST_CATEGORIES } from "@/lib/constants";
import { createPostAction } from "@/server/actions/posts";
import { toast } from "sonner";

export function PostComposer() {
  const [category, setCategory] = React.useState<string>("geral");
  const [title, setTitle] = React.useState("");
  const [body, setBody] = React.useState("");
  const [open, setOpen] = React.useState(false);
  const [pending, startTransition] = React.useTransition();

  function submit() {
    if (body.trim().length < 2) {
      toast.error("Conteúdo muito curto.");
      return;
    }
    const fd = new FormData();
    fd.append("category", category);
    fd.append("title", title);
    fd.append("body", body);
    startTransition(async () => {
      const res = await createPostAction(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao publicar.");
        return;
      }
      toast.success("Publicação criada.");
      setTitle("");
      setBody("");
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
            O que está acontecendo? Compartilhe com a comunidade…
          </button>
        </CardContent>
      </Card>
    );
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-4">
        <div className="grid gap-2 sm:grid-cols-[1fr_220px]">
          <Input
            placeholder="Título (opcional)"
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            maxLength={160}
          />
          <Select value={category} onValueChange={setCategory}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {POST_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>

        <Tabs defaultValue="write">
          <TabsList>
            <TabsTrigger value="write">Escrever</TabsTrigger>
            <TabsTrigger value="preview">Pré-visualizar</TabsTrigger>
          </TabsList>
          <TabsContent value="write">
            <Textarea
              rows={6}
              placeholder="Escreva em Markdown — **negrito**, _itálico_, listas, [links](#)…"
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
