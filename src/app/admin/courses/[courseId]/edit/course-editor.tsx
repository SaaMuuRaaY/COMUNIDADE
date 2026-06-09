"use client";

import * as React from "react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Plus } from "lucide-react";
import { createModuleAction, createLessonAction } from "@/server/actions/courses";
import { toast } from "sonner";

type Module = { id: string; title: string; order_index: number };
type Lesson = {
  id: string;
  module_id: string;
  title: string;
  video_url: string | null;
  content: string | null;
  order_index: number;
  duration_seconds: number;
  is_free: boolean;
};

export function CourseEditor({
  courseId,
  modules,
  lessons,
}: {
  courseId: string;
  modules: Module[];
  lessons: Lesson[];
}) {
  const [, startTransition] = React.useTransition();
  const [newModule, setNewModule] = React.useState("");
  const [newLesson, setNewLesson] = React.useState<Record<string, { title: string; video_url: string; content: string; duration: string }>>({});

  function addModule() {
    if (!newModule.trim()) return;
    const fd = new FormData();
    fd.append("course_id", courseId);
    fd.append("title", newModule);
    fd.append("order_index", String(modules.length));
    startTransition(async () => {
      const res = await createModuleAction(fd);
      if (!res.ok) toast.error(res.error ?? "Erro");
      else {
        toast.success("Módulo criado.");
        setNewModule("");
      }
    });
  }

  function addLesson(moduleId: string) {
    const draft = newLesson[moduleId];
    if (!draft || !draft.title.trim()) return;
    const fd = new FormData();
    fd.append("module_id", moduleId);
    fd.append("course_id", courseId);
    fd.append("title", draft.title);
    fd.append("video_url", draft.video_url);
    fd.append("content", draft.content);
    fd.append("duration_seconds", draft.duration || "0");
    const existingLessons = lessons.filter((l) => l.module_id === moduleId);
    fd.append("order_index", String(existingLessons.length));
    startTransition(async () => {
      const res = await createLessonAction(fd);
      if (!res.ok) toast.error(res.error ?? "Erro");
      else {
        toast.success("Aula criada.");
        setNewLesson((n) => ({ ...n, [moduleId]: { title: "", video_url: "", content: "", duration: "" } }));
      }
    });
  }

  return (
    <div className="space-y-4">
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Adicionar módulo</CardTitle>
        </CardHeader>
        <CardContent className="flex items-center gap-2">
          <Input
            value={newModule}
            onChange={(e) => setNewModule(e.target.value)}
            placeholder="Título do módulo"
          />
          <Button onClick={addModule} className="gap-2 shrink-0">
            <Plus className="h-4 w-4" /> Adicionar
          </Button>
        </CardContent>
      </Card>

      {modules.length === 0 ? (
        <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
          Nenhum módulo ainda. Crie o primeiro acima.
        </p>
      ) : (
        modules.map((m) => {
          const mLessons = lessons.filter((l) => l.module_id === m.id);
          const draft = newLesson[m.id] ?? { title: "", video_url: "", content: "", duration: "" };
          return (
            <Card key={m.id}>
              <CardHeader>
                <CardTitle className="text-base">{m.title}</CardTitle>
              </CardHeader>
              <CardContent className="space-y-4">
                {mLessons.length > 0 ? (
                  <ul className="divide-y rounded-md border">
                    {mLessons.map((l) => (
                      <li key={l.id} className="flex items-center justify-between p-3 text-sm">
                        <span className="font-medium">{l.title}</span>
                        {l.video_url ? (
                          <span className="text-xs text-muted-foreground">com vídeo</span>
                        ) : (
                          <span className="text-xs text-muted-foreground">sem vídeo</span>
                        )}
                      </li>
                    ))}
                  </ul>
                ) : (
                  <p className="text-sm text-muted-foreground">Sem aulas.</p>
                )}

                <div className="space-y-3 rounded-md border bg-muted/30 p-3">
                  <p className="text-xs font-semibold uppercase text-muted-foreground">Nova aula</p>
                  <div className="grid gap-2 sm:grid-cols-2">
                    <div className="space-y-1">
                      <Label className="text-xs">Título</Label>
                      <Input
                        value={draft.title}
                        onChange={(e) =>
                          setNewLesson((n) => ({ ...n, [m.id]: { ...draft, title: e.target.value } }))
                        }
                      />
                    </div>
                    <div className="space-y-1">
                      <Label className="text-xs">URL do vídeo (opcional)</Label>
                      <Input
                        value={draft.video_url}
                        onChange={(e) =>
                          setNewLesson((n) => ({ ...n, [m.id]: { ...draft, video_url: e.target.value } }))
                        }
                        placeholder="https://… (Supabase Storage / Mux / etc.)"
                      />
                    </div>
                  </div>
                  <div className="space-y-1">
                    <Label className="text-xs">Conteúdo / texto da aula (Markdown)</Label>
                    <Textarea
                      rows={3}
                      value={draft.content}
                      onChange={(e) =>
                        setNewLesson((n) => ({ ...n, [m.id]: { ...draft, content: e.target.value } }))
                      }
                    />
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1 space-y-1">
                      <Label className="text-xs">Duração (segundos)</Label>
                      <Input
                        type="number"
                        value={draft.duration}
                        onChange={(e) =>
                          setNewLesson((n) => ({ ...n, [m.id]: { ...draft, duration: e.target.value } }))
                        }
                      />
                    </div>
                    <Button onClick={() => addLesson(m.id)} className="gap-2 self-end">
                      <Plus className="h-4 w-4" /> Adicionar aula
                    </Button>
                  </div>
                </div>
              </CardContent>
            </Card>
          );
        })
      )}
    </div>
  );
}
