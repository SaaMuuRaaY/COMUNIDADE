"use client";

import * as React from "react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Textarea } from "@/components/ui/textarea";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { YouTubeVideoEmbed } from "@/components/shared/youtube-video-embed";
import { isYouTubeUrl } from "@/lib/video/youtube";
import { updateSettingAction } from "@/server/actions/admin";
import { toast } from "sonner";

type Initial = {
  name: string;
  description: string;
  primary_color: string;
  visibility: "public" | "private";
  welcome_video_enabled: boolean;
  welcome_video_url: string;
  welcome_video_title: string;
};

export function SettingsForm({ initial }: { initial: Initial }) {
  const [pending, startTransition] = React.useTransition();
  const [form, setForm] = React.useState(initial);

  function update<K extends keyof Initial>(k: K, v: Initial[K]) {
    setForm((f) => ({ ...f, [k]: v }));
  }

  const videoUrl = form.welcome_video_url.trim();
  const videoUrlValid = videoUrl === "" || isYouTubeUrl(videoUrl);

  function save() {
    if (!videoUrlValid) {
      toast.error("A URL do vídeo de boas-vindas não é um link do YouTube.");
      return;
    }
    startTransition(async () => {
      const calls = await Promise.all([
        updateSettingAction("community.name", form.name),
        updateSettingAction("community.description", form.description),
        updateSettingAction("community.primary_color", form.primary_color),
        updateSettingAction("community.visibility", form.visibility),
        updateSettingAction("welcome_video.enabled", form.welcome_video_enabled),
        updateSettingAction("welcome_video.url", videoUrl),
        updateSettingAction("welcome_video.title", form.welcome_video_title),
      ]);
      const failed = calls.find((c) => !c.ok);
      if (failed) toast.error(failed.error ?? "Erro ao salvar.");
      else toast.success("Configurações salvas.");
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="space-y-1">
            <Label htmlFor="community-name">Nome da comunidade</Label>
            <Input
              id="community-name"
              value={form.name}
              onChange={(e) => update("name", e.target.value)}
            />
          </div>
          <div className="space-y-1">
            <Label htmlFor="community-description">Descrição</Label>
            <Textarea
              id="community-description"
              rows={3}
              value={form.description}
              onChange={(e) => update("description", e.target.value)}
            />
          </div>
          <div className="grid gap-3 sm:grid-cols-2">
            <div className="space-y-1">
              <Label htmlFor="community-color">Cor primária</Label>
              <Input
                id="community-color"
                value={form.primary_color}
                onChange={(e) => update("primary_color", e.target.value)}
                placeholder="#0a0a0a"
              />
            </div>
            <div className="space-y-1">
              <Label htmlFor="community-visibility">Visibilidade</Label>
              <Select
                value={form.visibility}
                onValueChange={(v) => update("visibility", v as "public" | "private")}
              >
                <SelectTrigger id="community-visibility">
                  <SelectValue />
                </SelectTrigger>
                <SelectContent>
                  <SelectItem value="public">Aberta</SelectItem>
                  <SelectItem value="private">Fechada</SelectItem>
                </SelectContent>
              </Select>
            </div>
          </div>
        </CardContent>
      </Card>

      <Card>
        <CardContent className="space-y-3 p-5">
          <div className="flex items-center justify-between gap-4">
            <div>
              <h2 className="text-sm font-medium">Vídeo de boas-vindas</h2>
              <p className="text-xs text-muted-foreground">
                Exibido no topo do canal “Comece por aqui”.
              </p>
            </div>
            <Switch
              id="welcome-video-enabled"
              checked={form.welcome_video_enabled}
              onCheckedChange={(v) => update("welcome_video_enabled", v)}
              aria-label="Ativar vídeo de boas-vindas"
            />
          </div>

          <div className="space-y-1">
            <Label htmlFor="welcome-video-url">URL do vídeo (YouTube)</Label>
            <Input
              id="welcome-video-url"
              value={form.welcome_video_url}
              onChange={(e) => update("welcome_video_url", e.target.value)}
              placeholder="https://youtu.be/… ou https://www.youtube.com/watch?v=…"
              aria-invalid={!videoUrlValid}
              aria-describedby={!videoUrlValid ? "welcome-video-url-error" : undefined}
            />
            {!videoUrlValid ? (
              <p id="welcome-video-url-error" className="text-xs text-destructive">
                Cole um link do YouTube (watch, youtu.be ou shorts).
              </p>
            ) : null}
          </div>

          <div className="space-y-1">
            <Label htmlFor="welcome-video-title">Título do vídeo (acessibilidade)</Label>
            <Input
              id="welcome-video-title"
              value={form.welcome_video_title}
              onChange={(e) => update("welcome_video_title", e.target.value)}
              placeholder="Boas-vindas ao Portal Nexus"
            />
          </div>

          {videoUrlValid && videoUrl ? (
            <div className="space-y-1">
              <p className="text-xs text-muted-foreground">Pré-visualização</p>
              <YouTubeVideoEmbed
                url={videoUrl}
                title={form.welcome_video_title || "Vídeo de boas-vindas"}
              />
            </div>
          ) : null}
        </CardContent>
      </Card>

      <div className="flex justify-end">
        <Button onClick={save} disabled={pending}>
          {pending ? "Salvando…" : "Salvar"}
        </Button>
      </div>
    </div>
  );
}
