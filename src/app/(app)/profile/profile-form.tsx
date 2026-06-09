"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { updateProfileAction } from "@/server/actions/profile";
import { toast } from "sonner";
import type { Profile } from "@/types/db";

export function ProfileForm({ profile }: { profile: Profile }) {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState({
    full_name: profile.full_name ?? "",
    username: profile.username ?? "",
    bio: profile.bio ?? "",
    avatar_url: profile.avatar_url ?? "",
  });

  function onChange<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  function submit() {
    const fd = new FormData();
    Object.entries(form).forEach(([k, v]) => fd.append(k, v));
    startTransition(async () => {
      const res = await updateProfileAction(fd);
      if (!res.ok) toast.error(res.error ?? "Erro ao salvar.");
      else toast.success("Perfil atualizado.");
    });
  }

  return (
    <div className="space-y-4">
      <div className="space-y-2">
        <Label htmlFor="full_name">Nome</Label>
        <Input id="full_name" value={form.full_name} onChange={(e) => onChange("full_name", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="username">Username</Label>
        <Input id="username" value={form.username} onChange={(e) => onChange("username", e.target.value)} />
      </div>
      <div className="space-y-2">
        <Label htmlFor="bio">Bio</Label>
        <Textarea
          id="bio"
          rows={4}
          value={form.bio}
          onChange={(e) => onChange("bio", e.target.value)}
          maxLength={280}
        />
      </div>
      <div className="space-y-2">
        <Label htmlFor="avatar_url">URL do avatar</Label>
        <Input
          id="avatar_url"
          value={form.avatar_url}
          onChange={(e) => onChange("avatar_url", e.target.value)}
          placeholder="https://…"
        />
      </div>
      <Button onClick={submit} disabled={pending}>
        {pending ? "Salvando…" : "Salvar alterações"}
      </Button>
    </div>
  );
}
