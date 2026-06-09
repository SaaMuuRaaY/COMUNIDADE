"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { createCourseAction } from "@/server/actions/courses";
import { slugify } from "@/lib/utils";
import { toast } from "sonner";

export function CourseFormNew() {
  const router = useRouter();
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    title: "",
    slug: "",
    description: "",
    cover_url: "",
    status: "draft",
  });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.title || !form.slug) {
      toast.error("Título e slug obrigatórios.");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await createCourseAction(fd);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao criar curso.");
        return;
      }
      toast.success("Curso criado.");
      router.push(`/admin/courses/${res.id}/edit`);
    });
  }

  return (
    <Card>
      <CardContent className="space-y-4 p-5">
        <div className="space-y-2">
          <Label htmlFor="title">Título</Label>
          <Input
            id="title"
            value={form.title}
            onChange={(e) => {
              update("title", e.target.value);
              if (!form.slug) update("slug", slugify(e.target.value));
            }}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="slug">Slug</Label>
          <Input id="slug" value={form.slug} onChange={(e) => update("slug", slugify(e.target.value))} />
        </div>
        <div className="space-y-2">
          <Label htmlFor="description">Descrição</Label>
          <Textarea
            id="description"
            rows={4}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="space-y-2">
          <Label htmlFor="cover_url">URL da capa (opcional)</Label>
          <Input id="cover_url" value={form.cover_url} onChange={(e) => update("cover_url", e.target.value)} />
        </div>
        <div className="space-y-2">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => update("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="draft">Rascunho</SelectItem>
              <SelectItem value="published">Publicado</SelectItem>
            </SelectContent>
          </Select>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending ? "Criando…" : "Criar curso"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
