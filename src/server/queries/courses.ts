import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getPublishedCoursesWithProgress(userId: string) {
  const supabase = await createClient();
  const [coursesRes, lessonsRes, progressRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, slug, description, cover_url, status, order_index")
      .eq("status", "published")
      .order("order_index"),
    supabase.from("lessons").select("id, course_id"),
    supabase.from("lesson_progress").select("course_id, lesson_id, completed").eq("user_id", userId),
  ]);

  const lessonsByCourse = new Map<string, number>();
  (lessonsRes.data ?? []).forEach((l) =>
    lessonsByCourse.set(l.course_id as string, (lessonsByCourse.get(l.course_id as string) ?? 0) + 1),
  );

  const completedByCourse = new Map<string, number>();
  (progressRes.data ?? [])
    .filter((p) => p.completed)
    .forEach((p) =>
      completedByCourse.set(
        p.course_id as string,
        (completedByCourse.get(p.course_id as string) ?? 0) + 1,
      ),
    );

  return (coursesRes.data ?? []).map((c) => ({
    ...c,
    total_lessons: lessonsByCourse.get(c.id as string) ?? 0,
    completed_lessons: completedByCourse.get(c.id as string) ?? 0,
  }));
}

export async function getCourseDetail(courseId: string, userId: string) {
  const supabase = await createClient();
  const [{ data: course }, { data: modulesRaw }, { data: lessons }, { data: progress }] =
    await Promise.all([
      supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
      supabase
        .from("course_modules")
        .select("id, title, description, order_index")
        .eq("course_id", courseId)
        .order("order_index"),
      supabase
        .from("lessons")
        .select("id, module_id, title, description, order_index, duration_seconds, is_free")
        .eq("course_id", courseId)
        .order("order_index"),
      supabase
        .from("lesson_progress")
        .select("lesson_id, completed")
        .eq("course_id", courseId)
        .eq("user_id", userId),
    ]);

  if (!course) return null;

  const completedSet = new Set<string>(
    (progress ?? []).filter((p) => p.completed).map((p) => p.lesson_id as string),
  );

  const modules = (modulesRaw ?? []).map((m) => ({
    ...m,
    lessons: (lessons ?? [])
      .filter((l) => l.module_id === m.id)
      .map((l) => ({ ...l, completed: completedSet.has(l.id as string) })),
  }));

  const totalLessons = lessons?.length ?? 0;
  const completedLessons = completedSet.size;

  return { course, modules, totalLessons, completedLessons };
}

export async function getLessonForViewer(lessonId: string, userId: string) {
  const supabase = await createClient();
  const { data: lesson } = await supabase
    .from("lessons")
    .select("*")
    .eq("id", lessonId)
    .maybeSingle();
  if (!lesson) return null;

  // SEC-03 (defesa em profundidade): só serve a aula se o curso pai for visível
  // ao usuário. A RLS de `courses` (courses_select_published_or_mod) já retorna
  // null quando o curso é draft e o usuário não é moderador/admin.
  const { data: parentCourse } = await supabase
    .from("courses")
    .select("id")
    .eq("id", lesson.course_id)
    .maybeSingle();
  if (!parentCourse) return null;

  const [{ data: progress }, { data: siblings }] = await Promise.all([
    supabase
      .from("lesson_progress")
      .select("completed")
      .eq("lesson_id", lessonId)
      .eq("user_id", userId)
      .maybeSingle(),
    supabase
      .from("lessons")
      .select("id, title, order_index, module_id")
      .eq("course_id", lesson.course_id)
      .order("order_index"),
  ]);

  return {
    lesson,
    completed: !!progress?.completed,
    siblings: siblings ?? [],
  };
}
