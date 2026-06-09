import "server-only";
import { createClient } from "@/lib/supabase/server";

export async function getDashboardData(userId: string) {
  const supabase = await createClient();

  const [coursesRes, postsRes, eventsRes, progressRes] = await Promise.all([
    supabase
      .from("courses")
      .select("id, title, slug, cover_url")
      .eq("status", "published")
      .order("order_index")
      .limit(4),
    supabase
      .from("posts")
      .select("id, title, body, created_at, category, author_id, profiles:author_id(full_name, avatar_url)")
      .eq("is_deleted", false)
      .order("created_at", { ascending: false })
      .limit(4),
    supabase
      .from("events")
      .select("id, title, event_type, starts_at, external_url")
      .gte("starts_at", new Date().toISOString())
      .order("starts_at")
      .limit(4),
    supabase
      .from("lesson_progress")
      .select("course_id")
      .eq("user_id", userId)
      .eq("completed", true),
  ]);

  return {
    courses: coursesRes.data ?? [],
    posts: postsRes.data ?? [],
    events: eventsRes.data ?? [],
    completedLessonsByCourse: (progressRes.data ?? []).reduce<Record<string, number>>((acc, row) => {
      acc[row.course_id] = (acc[row.course_id] ?? 0) + 1;
      return acc;
    }, {}),
  };
}
