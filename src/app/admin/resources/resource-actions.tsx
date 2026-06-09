"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteIconButton } from "@/components/shared/confirm-delete-icon-button";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import { createResourceAction, deleteResourceAction } from "@/server/actions/resources-apps-events";
import { toast } from "sonner";

export function ResourceComposer() {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    category: "apostilas",
    file_url: "",
    file_type: "",
  });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.title) {
      toast.error("Título obrigatório.");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await createResourceAction(fd);
      if (!res.ok) toast.error(res.error ?? "Erro ao salvar.");
      else {
        toast.success("Recurso adicionado.");
        setForm({ title: "", description: "", category: "apostilas", file_url: "", file_type: "" });
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Título</Label>
            <Input value={form.title} onChange={(e) => update("title", e.target.value)} />
          </div>
          <div className="space-y-1">
            <Label>Categoria</Label>
            <Select value={form.category} onValueChange={(v) => update("category", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {RESOURCE_CATEGORIES.map((c) => (
                  <SelectItem key={c.value} value={c.value}>
                    {c.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="space-y-1">
          <Label>Descrição</Label>
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>URL do arquivo</Label>
            <Input
              value={form.file_url}
              onChange={(e) => update("file_url", e.target.value)}
              placeholder="https://…"
            />
          </div>
          <div className="space-y-1">
            <Label>Tipo MIME (opcional)</Label>
            <Input
              value={form.file_type}
              onChange={(e) => update("file_type", e.target.value)}
              placeholder="application/pdf"
            />
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando…" : "Adicionar recurso"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DeleteResourceInline({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  function handle() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteResourceAction(id);
        if (!res.ok) toast.error(res.error ?? "Erro");
        else toast.success("Recurso excluído.");
        resolve();
      });
    });
  }
  return (
    <ConfirmDeleteIconButton
      onConfirm={handle}
      title="Excluir recurso?"
      description="O recurso será removido da biblioteca."
      pending={pending}
      ariaLabel="Excluir recurso"
    />
  );
}
