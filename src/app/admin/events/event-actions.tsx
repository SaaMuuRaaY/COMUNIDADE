"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteIconButton } from "@/components/shared/confirm-delete-icon-button";
import { EVENT_TYPES } from "@/lib/constants";
import { createEventAction, deleteEventAction } from "@/server/actions/resources-apps-events";
import { toast } from "sonner";

export function EventComposer() {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    title: "",
    description: "",
    event_type: "live",
    starts_at: "",
    external_url: "",
  });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.title || !form.starts_at) {
      toast.error("Título e data são obrigatórios.");
      return;
    }
    const fd = new FormData();
    fd.append("title", form.title);
    fd.append("description", form.description);
    fd.append("event_type", form.event_type);
    fd.append("starts_at", new Date(form.starts_at).toISOString());
    fd.append("external_url", form.external_url);
    startTransition(async () => {
      const res = await createEventAction(fd);
      if (!res.ok) toast.error(res.error ?? "Erro");
      else {
        toast.success("Evento criado.");
        setForm({ title: "", description: "", event_type: "live", starts_at: "", external_url: "" });
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
            <Label>Tipo</Label>
            <Select value={form.event_type} onValueChange={(v) => update("event_type", v)}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {EVENT_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    {t.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>Início</Label>
            <Input
              type="datetime-local"
              value={form.starts_at}
              onChange={(e) => update("starts_at", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label>Link externo (Meet, Zoom, YouTube…)</Label>
            <Input
              value={form.external_url}
              onChange={(e) => update("external_url", e.target.value)}
            />
          </div>
        </div>
        <div className="space-y-1">
          <Label>Descrição</Label>
          <Textarea
            rows={3}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="flex justify-end">
          <Button onClick={submit} disabled={pending}>
            {pending ? "Salvando…" : "Criar evento"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

export function DeleteEventInline({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  function handle() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteEventAction(id);
        if (!res.ok) toast.error(res.error ?? "Erro");
        else toast.success("Evento excluído.");
        resolve();
      });
    });
  }
  return (
    <ConfirmDeleteIconButton
      onConfirm={handle}
      title="Excluir evento?"
      description="O evento será removido do calendário."
      pending={pending}
      ariaLabel="Excluir evento"
    />
  );
}
