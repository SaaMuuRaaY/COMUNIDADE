import Link from "next/link";
import { GraduationCap } from "lucide-react";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";

type Props = {
  href: string;
  title: string;
  description?: string | null;
  coverUrl?: string | null;
  totalLessons: number;
  completedLessons: number;
  status?: "draft" | "published";
};

export function CourseCard({
  href,
  title,
  description,
  coverUrl,
  totalLessons,
  completedLessons,
  status,
}: Props) {
  const pct = totalLessons === 0 ? 0 : Math.round((completedLessons / totalLessons) * 100);
  return (
    <Link href={href}>
      <Card className="h-full overflow-hidden transition-colors hover:bg-accent">
        <div
          className="flex h-32 items-center justify-center bg-zinc-100 text-zinc-400 dark:bg-zinc-800"
          style={
            coverUrl
              ? { backgroundImage: `url(${coverUrl})`, backgroundSize: "cover", backgroundPosition: "center" }
              : undefined
          }
        >
          {!coverUrl ? <GraduationCap className="h-8 w-8" /> : null}
        </div>
        <CardContent className="space-y-3 p-4">
          <div className="flex items-center gap-2">
            {status === "draft" ? <Badge variant="warning">Rascunho</Badge> : null}
            <Badge variant="outline" className="text-[10px]">
              {totalLessons} aulas
            </Badge>
          </div>
          <h3 className="font-semibold leading-tight">{title}</h3>
          {description ? (
            <p className="line-clamp-2 text-sm text-muted-foreground">{description}</p>
          ) : null}
          <div className="space-y-1">
            <Progress value={pct} />
            <p className="text-[10px] text-muted-foreground">
              {completedLessons}/{totalLessons} concluídas · {pct}%
            </p>
          </div>
        </CardContent>
      </Card>
    </Link>
  );
}
