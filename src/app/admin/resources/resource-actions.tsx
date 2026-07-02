"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
  DialogTrigger,
} from "@/components/ui/dialog";
import { ConfirmDeleteIconButton } from "@/components/shared/confirm-delete-icon-button";
import { RESOURCE_CATEGORIES } from "@/lib/constants";
import {
  createResourceAction,
  updateResourceAction,
  deleteResourceAction,
} from "@/server/actions/resources-apps-events";
import { toast } from "sonner";

type ResourceFormValues = {
  title: string;
  description: string;
  category: string;
  file_url: string;
  file_type: string;
};

const EMPTY: ResourceFormValues = {
  title: "",
  description: "",
  category: "apostilas",
  file_url: "",
  file_type: "",
};

function toFormData(values: ResourceFormValues): FormData {
  const fd = new FormData();
  Object.entries(values).forEach(([k, v]) => fd.append(k, v));
  return fd;
}

function ResourceForm({
  initial,
  submitLabel,
  successMessage,
  resetAfterSubmit,
  onSubmit,
  onSuccess,
}: {
  initial: ResourceFormValues;
  submitLabel: string;
  successMessage: string;
  resetAfterSubmit?: boolean;
  onSubmit: (values: ResourceFormValues) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState<ResourceFormValues>(initial);

  function update<K extends keyof ResourceFormValues>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.title.trim()) {
      toast.error("Título obrigatório.");
      return;
    }
    startTransition(async () => {
      const res = await onSubmit(form);
      if (!res.ok) {
        toast.error(res.error ?? "Erro ao salvar.");
        return;
      }
      toast.success(successMessage);
      if (resetAfterSubmit) setForm(initial);
      onSuccess?.();
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
          rows={3}
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
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function ResourceComposer() {
  return (
    <Card>
      <CardContent className="p-5">
        <ResourceForm
          initial={EMPTY}
          submitLabel="Adicionar recurso"
          successMessage="Recurso adicionado."
          resetAfterSubmit
          onSubmit={(values) => createResourceAction(toFormData(values))}
        />
      </CardContent>
    </Card>
  );
}

/** CTA contextual (F4.1) — botão "Adicionar recurso" em dialog, reusa ResourceForm. */
export function CreateResourceButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar recurso
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Adicionar recurso</DialogTitle>
          <DialogDescription className="sr-only">Novo recurso da biblioteca</DialogDescription>
        </DialogHeader>
        <ResourceForm
          initial={EMPTY}
          submitLabel="Adicionar recurso"
          successMessage="Recurso adicionado."
          onSubmit={(values) => createResourceAction(toFormData(values))}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

type ResourceRow = {
  id: string;
  title: string;
  description: string | null;
  category: string;
  file_url: string | null;
  file_type: string | null;
};

export function EditResourceDialog({ resource }: { resource: ResourceRow }) {
  const [open, setOpen] = React.useState(false);
  const initial: ResourceFormValues = {
    title: resource.title,
    description: resource.description ?? "",
    category: resource.category,
    file_url: resource.file_url ?? "",
    file_type: resource.file_type ?? "",
  };

  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar recurso">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-w-lg">
        <DialogHeader>
          <DialogTitle>Editar recurso</DialogTitle>
          <DialogDescription className="sr-only">Editar os dados do recurso</DialogDescription>
        </DialogHeader>
        <ResourceForm
          initial={initial}
          submitLabel="Salvar"
          successMessage="Recurso atualizado."
          onSubmit={(values) => updateResourceAction(resource.id, toFormData(values))}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
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
