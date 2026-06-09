import Link from "next/link";
import { notFound } from "next/navigation";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { CheckCircle2, Circle, Clock } from "lucide-react";
import { requireProfile } from "@/lib/auth/current-user";
import { getCourseDetail } from "@/server/queries/courses";

type Params = Promise<{ courseId: string }>;

function formatDuration(seconds: number): string {
  if (!seconds) return "—";
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m${s ? ` ${s}s` : ""}`;
}

export default async function CourseDetailPage({ params }: { params: Params }) {
  const { courseId } = await params;
  const profile = await requireProfile();
  const detail = await getCourseDetail(courseId, profile.id);
  if (!detail) notFound();

  const { course, modules, totalLessons, completedLessons } = detail;
  const pct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">{course.title as string}</h1>
        {course.description ? (
          <p className="text-sm text-muted-foreground">{course.description as string}</p>
        ) : null}
      </div>

      <Card>
        <CardContent className="space-y-2 p-5">
          <div className="flex items-center gap-3 text-sm">
            <Badge variant="outline">{totalLessons} aulas</Badge>
            <span className="text-muted-foreground">·</span>
            <span>
              {completedLessons}/{totalLessons} concluídas
            </span>
            <span className="ml-auto text-muted-foreground">{pct}%</span>
          </div>
          <Progress value={pct} />
        </CardContent>
      </Card>

      <div className="space-y-4">
        {modules.length === 0 ? (
          <p className="rounded-md border border-dashed bg-muted/30 p-6 text-center text-sm text-muted-foreground">
            Nenhum módulo cadastrado ainda.
          </p>
        ) : (
          modules.map((m) => (
            <Card key={m.id as string}>
              <CardHeader>
                <CardTitle className="text-base">{m.title as string}</CardTitle>
                {m.description ? (
                  <p className="text-sm text-muted-foreground">{m.description as string}</p>
                ) : null}
              </CardHeader>
              <CardContent>
                <ul className="divide-y">
                  {m.lessons.length === 0 ? (
                    <li className="py-4 text-sm text-muted-foreground">Sem aulas neste módulo.</li>
                  ) : (
                    m.lessons.map((l) => (
                      <li key={l.id as string}>
                        <Link
                          href={`/courses/${courseId}/lessons/${l.id}`}
                          className="flex items-center gap-3 py-3 hover:bg-accent"
                        >
                          {l.completed ? (
                            <CheckCircle2 className="h-5 w-5 text-emerald-500" />
                          ) : (
                            <Circle className="h-5 w-5 text-muted-foreground" />
                          )}
                          <div className="min-w-0 flex-1">
                            <p className="font-medium">{l.title as string}</p>
                            {l.description ? (
                              <p className="line-clamp-1 text-xs text-muted-foreground">
                                {l.description as string}
                              </p>
                            ) : null}
                          </div>
                          <span className="flex items-center gap-1 text-xs text-muted-foreground">
                            <Clock className="h-3 w-3" />
                            {formatDuration((l.duration_seconds as number) ?? 0)}
                          </span>
                        </Link>
                      </li>
                    ))
                  )}
                </ul>
              </CardContent>
            </Card>
          ))
        )}
      </div>
    </div>
  );
}
