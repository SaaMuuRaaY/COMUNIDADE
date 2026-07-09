"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Pencil, Plus } from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ConfirmDeleteIconButton } from "@/components/shared/confirm-delete-icon-button";
import { EVENT_TYPES } from "@/lib/constants";
import { createEventAction, updateEventAction, deleteEventAction } from "@/server/actions/resources-apps-events";
import { toast } from "sonner";

type EventFormValues = {
  title: string;
  description: string;
  event_type: string;
  starts_at: string; // datetime-local (hora local do navegador)
  external_url: string;
};

const EMPTY_EVENT: EventFormValues = {
  title: "",
  description: "",
  event_type: "live",
  starts_at: "",
  external_url: "",
};

/** ISO (UTC) → valor de <input type="datetime-local"> na hora local do navegador. */
function isoToLocalInput(iso: string): string {
  const d = new Date(iso);
  return new Date(d.getTime() - d.getTimezoneOffset() * 60000).toISOString().slice(0, 16);
}

/** Form compartilhado de evento — reusado por criar (EventComposer) e editar (EditEventDialog). */
function EventForm({
  initial,
  submitLabel,
  successMessage,
  resetAfterSubmit,
  onSubmit,
  onSuccess,
}: {
  initial: EventFormValues;
  submitLabel: string;
  successMessage: string;
  resetAfterSubmit?: boolean;
  onSubmit: (fd: FormData) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState<EventFormValues>(initial);

  function update<K extends keyof EventFormValues>(k: K, v: string) {
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
      const res = await onSubmit(fd);
      if (!res.ok) toast.error(res.error ?? "Erro");
      else {
        toast.success(successMessage);
        if (resetAfterSubmit) setForm(initial);
        onSuccess?.();
      }
    });
  }

  return (
    <div className="space-y-3">
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
          <Input value={form.external_url} onChange={(e) => update("external_url", e.target.value)} />
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
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function EventComposer({ onSuccess }: { onSuccess?: () => void } = {}) {
  return (
    <Card>
      <CardContent className="p-5">
        <EventForm
          initial={EMPTY_EVENT}
          submitLabel="Criar evento"
          successMessage="Evento criado."
          resetAfterSubmit
          onSubmit={createEventAction}
          onSuccess={onSuccess}
        />
      </CardContent>
    </Card>
  );
}

/** CTA contextual (F4.3) — botão "Criar evento" em dialog, reusa EventComposer. */
export function CreateEventButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Criar evento
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Criar evento</DialogTitle>
          <DialogDescription className="sr-only">Novo evento do calendário</DialogDescription>
        </DialogHeader>
        <EventComposer onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export type EventRow = {
  id: string;
  title: string;
  description: string | null;
  event_type: string;
  starts_at: string;
  external_url: string | null;
};

export function EditEventDialog({ event }: { event: EventRow }) {
  const [open, setOpen] = React.useState(false);
  const initial: EventFormValues = {
    title: event.title,
    description: event.description ?? "",
    event_type: event.event_type,
    starts_at: isoToLocalInput(event.starts_at),
    external_url: event.external_url ?? "",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar evento">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar evento</DialogTitle>
          <DialogDescription className="sr-only">Editar os dados do evento</DialogDescription>
        </DialogHeader>
        <EventForm
          initial={initial}
          submitLabel="Salvar"
          successMessage="Evento atualizado."
          onSubmit={(fd) => updateEventAction(event.id, fd)}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
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
