"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { updateSettingAction } from "@/server/actions/admin";
import { toast } from "sonner";

type Initial = {
  name: string;
  description: string;
  primary_color: string;
  visibility: "public" | "private";
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState(initial);

  function update<K extends keyof Initial>(k: K, v: Initial[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function save() {
    startTransition(async () => {
      const calls = await Promise.all([
        updateSettingAction("community.name", form.name),
        updateSettingAction("community.description", form.description),
        updateSettingAction("community.primary_color", form.primary_color),
        updateSettingAction("community.visibility", form.visibility),
      ]);
      const failed = calls.find((c) => !c.ok);
      if (failed) toast.error(failed.error ?? "Erro ao salvar.");
      else toast.success("Configurações salvas.");
    });
  }

  return (
    <Card>
      <CardContent className="space-y-3 p-5">
        <div className="space-y-1">
          <Label>Nome da comunidade</Label>
          <Input value={form.name} onChange={(e) => update("name", e.target.value)} />
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
            <Label>Cor primária</Label>
            <Input
              value={form.primary_color}
              onChange={(e) => update("primary_color", e.target.value)}
              placeholder="#0a0a0a"
            />
          </div>
          <div className="space-y-1">
            <Label>Visibilidade</Label>
            <Select
              value={form.visibility}
              onValueChange={(v) => update("visibility", v as "public" | "private")}
            >
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="public">Aberta</SelectItem>
                <SelectItem value="private">Fechada</SelectItem>
              </SelectContent>
            </Select>
          </div>
        </div>
        <div className="flex justify-end">
          <Button onClick={save} disabled={pending}>
            {pending ? "Salvando…" : "Salvar"}
          </Button>
        </div>
      </CardContent>
    </Card>
  );
}
