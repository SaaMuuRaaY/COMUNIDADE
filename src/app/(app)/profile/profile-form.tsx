"use client";

import * as React from "react";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { AvatarUploader } from "@/components/shared/avatar-uploader";
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
    social_instagram: profile.social_links?.instagram ?? "",
    social_tiktok: profile.social_links?.tiktok ?? "",
    social_linkedin: profile.social_links?.linkedin ?? "",
    social_github: profile.social_links?.github ?? "",
    social_youtube: profile.social_links?.youtube ?? "",
  });

  function onChange<K extends keyof typeof form>(k: K, v: string) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const SOCIALS: { key: keyof typeof form; label: string; placeholder: string }[] = [
    { key: "social_instagram", label: "Instagram", placeholder: "https://instagram.com/seu_usuario" },
    { key: "social_tiktok", label: "TikTok", placeholder: "https://tiktok.com/@seu_usuario" },
    { key: "social_linkedin", label: "LinkedIn", placeholder: "https://linkedin.com/in/voce" },
    { key: "social_github", label: "GitHub", placeholder: "https://github.com/voce" },
    { key: "social_youtube", label: "YouTube", placeholder: "https://youtube.com/@seu_canal" },
  ];

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
      <AvatarUploader
        userId={profile.id}
        name={form.full_name || profile.full_name}
        value={form.avatar_url || null}
        onChange={(url) => onChange("avatar_url", url ?? "")}
      />
      <div className="space-y-3">
        <div>
          <Label>Redes sociais</Label>
          <p className="text-xs text-muted-foreground">Cole o link https do seu perfil em cada rede (opcional).</p>
        </div>
        {SOCIALS.map(({ key, label, placeholder }) => (
          <div key={key} className="flex items-center gap-2">
            <span className="w-20 shrink-0 text-xs text-muted-foreground">{label}</span>
            <Input
              aria-label={label}
              value={form[key]}
              onChange={(e) => onChange(key, e.target.value)}
              placeholder={placeholder}
            />
          </div>
        ))}
      </div>

      <Button onClick={submit} disabled={pending}>
        {pending ? "Salvando…" : "Salvar alterações"}
      </Button>
    </div>
  );
}
