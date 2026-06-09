import { notFound } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { CourseEditor } from "./course-editor";

type Params = Promise<{ courseId: string }>;

export const metadata = { title: "Editar curso" };

export default async function EditCoursePage({ params }: { params: Params }) {
  const { courseId } = await params;
  const supabase = await createClient();
  const [{ data: course }, { data: modules }, { data: lessons }] = await Promise.all([
    supabase.from("courses").select("*").eq("id", courseId).maybeSingle(),
    supabase
      .from("course_modules")
      .select("id, title, order_index")
      .eq("course_id", courseId)
      .order("order_index"),
    supabase
      .from("lessons")
      .select("id, module_id, title, video_url, content, order_index, duration_seconds, is_free")
      .eq("course_id", courseId)
      .order("order_index"),
  ]);

  if (!course) notFound();

  return (
    <div className="mx-auto max-w-4xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Editar: {course.title as string}</h1>
      <CourseEditor
        courseId={courseId}
        modules={(modules ?? []) as { id: string; title: string; order_index: number }[]}
        lessons={(lessons ?? []) as {
          id: string;
          module_id: string;
          title: string;
          video_url: string | null;
          content: string | null;
          order_index: number;
          duration_seconds: number;
          is_free: boolean;
        }[]}
      />
    </div>
  );
}
