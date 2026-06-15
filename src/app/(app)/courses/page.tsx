import { GraduationCap } from "lucide-react";
import { CourseCard } from "@/components/courses/course-card";
import { EmptyState } from "@/components/shared/empty-state";
import { requireProfile } from "@/lib/auth/current-user";
import { isModerator } from "@/lib/permissions/policies";
import { getPublishedCoursesWithProgress } from "@/server/queries/courses";

import { SectionBanner } from "@/components/shared/section-banner";
import { SECTION_BANNERS } from "@/lib/section-banners";

export const metadata = { title: "Cursos" };

export default async function CoursesPage() {
  const profile = await requireProfile();
  const courses = await getPublishedCoursesWithProgress(profile.id);
  const visible = courses.filter((c) => c.status === "published" || isModerator(profile));

  return (
    <div className="mx-auto max-w-6xl space-y-4 p-4 md:p-6">
      <SectionBanner {...SECTION_BANNERS.courses} />

      {visible.length === 0 ? (
        <EmptyState icon={GraduationCap} title="Sem cursos publicados ainda" />
      ) : (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {visible.map((c) => (
            <CourseCard
              key={c.id}
              href={`/courses/${c.id}`}
              title={c.title}
              description={c.description}
              coverUrl={c.cover_url}
              totalLessons={c.total_lessons}
              completedLessons={c.completed_lessons}
              status={c.status as "draft" | "published"}
            />
          ))}
        </div>
      )}
    </div>
  );
}
