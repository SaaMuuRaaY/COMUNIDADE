"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Plus } from "lucide-react";
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
import { APP_CATEGORIES, APP_STATUSES, APP_TYPES } from "@/lib/constants";
import { createAppAction, deleteAppAction } from "@/server/actions/resources-apps-events";
import { CoverUploader } from "@/components/shared/cover-uploader";
import { toast } from "sonner";

export function AppComposer({ onSuccess }: { onSuccess?: () => void } = {}) {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
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
  });

  function update<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    if (!form.name) {
      toast.error("Nome obrigatório.");
      return;
    }
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await createAppAction(fd);
      if (!res.ok) toast.error(res.error ?? "Erro");
      else {
        toast.success("App cadastrado.");
        setForm({
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
        });
        onSuccess?.();
      }
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
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
          <Textarea
            rows={2}
            value={form.description}
            onChange={(e) => update("description", e.target.value)}
          />
        </div>
        <div className="grid gap-3 sm:grid-cols-2">
          <div className="space-y-1">
            <Label>URL externa</Label>
            <Input
              value={form.url}
              onChange={(e) => update("url", e.target.value)}
              placeholder="https://…"
            />
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
            {pending ? "Salvando…" : "Cadastrar app"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}

/** CTA contextual (F4.2) — botão "Adicionar aplicativo" em dialog, reusa AppComposer. */
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
