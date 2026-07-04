"use client";

import * as React from "react";
import { Pencil, Plus } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
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
import { CoverUploader } from "@/components/shared/cover-uploader";
import { APP_CATEGORIES, APP_STATUSES, APP_TYPES } from "@/lib/constants";
import { createAppAction, updateAppAction, deleteAppAction } from "@/server/actions/resources-apps-events";
import { toast } from "sonner";

type AppFormValues = {
  name: string;
  description: string;
  category: string;
  type: string;
  status: string;
  url: string;
  embed_url: string;
  file_url: string;
  icon_url: string;
  cover_url: string;
};

const EMPTY: AppFormValues = {
  name: "",
  description: "",
  category: "ia",
  type: "link",
  status: "active",
  url: "",
  embed_url: "",
  file_url: "",
  icon_url: "",
  cover_url: "",
};

function toFormData(v: AppFormValues): FormData {
  const fd = new FormData();
  Object.entries(v).forEach(([k, val]) => fd.append(k, val));
  return fd;
}

function AppForm({
  initial,
  submitLabel,
  successMessage,
  resetAfterSubmit,
  onSubmit,
  onSuccess,
}: {
  initial: AppFormValues;
  submitLabel: string;
  successMessage: string;
  resetAfterSubmit?: boolean;
  onSubmit: (v: AppFormValues) => Promise<{ ok: boolean; error?: string }>;
  onSuccess?: () => void;
}) {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState<AppFormValues>(initial);

  function update<K extends keyof AppFormValues>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.name.trim()) {
      toast.error("Nome obrigatório.");
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
          <Label>Nome</Label>
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Categoria</Label>
          <Select value={form.category} onValueChange={(v) => update("category", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APP_CATEGORIES.map((c) => (
                <SelectItem key={c.value} value={c.value}>
                  {c.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>Tipo</Label>
          <Select value={form.type} onValueChange={(v) => update("type", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APP_TYPES.map((t) => (
                <SelectItem key={t.value} value={t.value}>
                  {t.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
        <div className="space-y-1">
          <Label>Status</Label>
          <Select value={form.status} onValueChange={(v) => update("status", v)}>
            <SelectTrigger>
              <SelectValue />
            </SelectTrigger>
            <SelectContent>
              {APP_STATUSES.map((s) => (
                <SelectItem key={s.value} value={s.value}>
                  {s.label}
                </SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      <div className="space-y-1">
        <Label>Descrição</Label>
        <Textarea rows={2} value={form.description} onChange={(e) => update("description", e.target.value)} />
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>URL externa</Label>
          <Input value={form.url} onChange={(e) => update("url", e.target.value)} placeholder="https://…" />
        </div>
        <div className="space-y-1">
          <Label>URL para embed (opcional)</Label>
          <Input
            value={form.embed_url}
            onChange={(e) => update("embed_url", e.target.value)}
            placeholder="https://… (YouTube, Loom, Vimeo, etc.)"
          />
        </div>
      </div>
      <div className="grid gap-3 sm:grid-cols-2">
        <div className="space-y-1">
          <Label>URL do arquivo (se type=file)</Label>
          <Input value={form.file_url} onChange={(e) => update("file_url", e.target.value)} />
        </div>
        <div className="space-y-1">
          <Label>Ícone (URL imagem)</Label>
          <Input value={form.icon_url} onChange={(e) => update("icon_url", e.target.value)} />
        </div>
      </div>
      <CoverUploader value={form.cover_url || null} onChange={(url) => update("cover_url", url ?? "")} />
      <div className="flex justify-end">
        <Button onClick={submit} disabled={pending}>
          {pending ? "Salvando…" : submitLabel}
        </Button>
      </div>
    </div>
  );
}

export function AppComposer({ onSuccess }: { onSuccess?: () => void } = {}) {
  return (
    <Card>
      <CardContent className="p-5">
        <AppForm
          initial={EMPTY}
          submitLabel="Cadastrar app"
          successMessage="App cadastrado."
          resetAfterSubmit
          onSubmit={(v) => createAppAction(toFormData(v))}
          onSuccess={onSuccess}
        />
      </CardContent>
    </Card>
  );
}

/** CTA contextual — botão "Adicionar aplicativo" em dialog, reusa AppComposer. */
export function CreateAppButton() {
  const [open, setOpen] = React.useState(false);
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button size="sm" className="gap-2">
          <Plus className="h-4 w-4" /> Adicionar aplicativo
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Adicionar aplicativo</DialogTitle>
          <DialogDescription className="sr-only">Novo aplicativo</DialogDescription>
        </DialogHeader>
        <AppComposer onSuccess={() => setOpen(false)} />
      </DialogContent>
    </Dialog>
  );
}

export type AppRow = AppFormValues & { id: string };

export function EditAppDialog({ app }: { app: AppRow }) {
  const [open, setOpen] = React.useState(false);
  const { id, ...initial } = app;
  return (
    <Dialog open={open} onOpenChange={setOpen}>
      <DialogTrigger asChild>
        <Button variant="ghost" size="icon" aria-label="Editar aplicativo">
          <Pencil className="h-4 w-4" />
        </Button>
      </DialogTrigger>
      <DialogContent className="max-h-[85vh] max-w-lg overflow-y-auto">
        <DialogHeader>
          <DialogTitle>Editar aplicativo</DialogTitle>
          <DialogDescription className="sr-only">Editar os dados do aplicativo</DialogDescription>
        </DialogHeader>
        <AppForm
          initial={initial}
          submitLabel="Salvar"
          successMessage="App atualizado."
          onSubmit={(v) => updateAppAction(id, toFormData(v))}
          onSuccess={() => setOpen(false)}
        />
      </DialogContent>
    </Dialog>
  );
}

export function DeleteAppInline({ id }: { id: string }) {
  const [pending, startTransition] = React.useTransition();
  function handle() {
    return new Promise<void>((resolve) => {
      startTransition(async () => {
        const res = await deleteAppAction(id);
        if (!res.ok) toast.error(res.error ?? "Erro");
        else toast.success("App excluído.");
        resolve();
      });
    });
  }
  return (
    <ConfirmDeleteIconButton
      onConfirm={handle}
      title="Excluir app?"
      description="O app será removido da biblioteca."
      pending={pending}
      ariaLabel="Excluir app"
    />
  );
}
