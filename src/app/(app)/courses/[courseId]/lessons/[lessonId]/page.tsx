import Link from "next/link";
import { notFound } from "next/navigation";
import { ArrowLeft, ChevronLeft, ChevronRight, MessageSquareText } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { LessonPlayer } from "@/components/courses/lesson-player";
import { Markdown } from "@/components/shared/markdown";
import { requireProfile } from "@/lib/auth/current-user";
import { getLessonForViewer } from "@/server/queries/courses";

type Params = Promise<{ courseId: string; lessonId: string }>;

export default async function LessonPage({ params }: { params: Params }) {
  const { courseId, lessonId } = await params;
  const profile = await requireProfile();
  const data = await getLessonForViewer(lessonId, profile.id, courseId);
  if (!data) notFound();
  const { lesson, completed, siblings } = data;

  const idx = siblings.findIndex((s) => s.id === lessonId);
  const prev = idx > 0 ? siblings[idx - 1] : null;
  const next = idx < siblings.length - 1 ? siblings[idx + 1] : null;

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <Button asChild variant="ghost" size="sm" className="gap-1">
        <Link href={`/courses/${courseId}`}>
          <ArrowLeft className="h-4 w-4" /> Voltar ao curso
        </Link>
      </Button>

      <div className="space-y-1">
        <h1 className="text-2xl font-semibold tracking-tight">{lesson.title as string}</h1>
        {lesson.description ? (
          <p className="text-sm text-muted-foreground">{lesson.description as string}</p>
        ) : null}
      </div>

      <LessonPlayer
        lessonId={lessonId}
        courseId={courseId}
        videoUrl={(lesson.video_url as string | null) ?? null}
        alreadyCompleted={completed}
      />

      {lesson.content ? (
        <Card>
          <CardContent className="p-5">
            <Markdown>{lesson.content as string}</Markdown>
          </CardContent>
        </Card>
      ) : null}

      {lesson.attachment_url ? (
        <a
          href={lesson.attachment_url as string}
          target="_blank"
          rel="noopener noreferrer"
          className="inline-flex items-center text-sm text-primary hover:underline"
        >
          📎 Baixar material de apoio
        </a>
      ) : null}

      <div className="rounded-md border bg-muted/40 p-3">
        <Button asChild variant="outline" size="sm" className="gap-2">
          <Link href="/duvidas-gerais">
            <MessageSquareText className="h-4 w-4" /> Tirar dúvida sobre esta aula na comunidade
          </Link>
        </Button>
      </div>

      <div className="flex items-center justify-between border-t pt-4">
        {prev ? (
          <Button asChild variant="outline" size="sm" className="gap-1">
            <Link href={`/courses/${courseId}/lessons/${prev.id}`}>
              <ChevronLeft className="h-4 w-4" /> Aula anterior
            </Link>
          </Button>
        ) : (
          <span />
        )}
        {next ? (
          <Button asChild size="sm" className="gap-1">
            <Link href={`/courses/${courseId}/lessons/${next.id}`}>
              Próxima aula <ChevronRight className="h-4 w-4" />
            </Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
