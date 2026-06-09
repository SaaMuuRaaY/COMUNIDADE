"use server";

import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { requireProfile, requireModerator } from "@/lib/auth/current-user";
import { awardPoints } from "@/lib/points/award";
import { courseSchema, moduleSchema, lessonSchema } from "@/lib/validations/schemas";
import { COMMUNITY_ID, POINTS } from "@/lib/constants";

type Result = { ok: boolean; error?: string; id?: string };

export async function createCourseAction(formData: FormData): Promise<Result> {
  const profile = await requireModerator();
  const parsed = courseSchema.safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description") || null,
    cover_url: formData.get("cover_url") || null,
    status: formData.get("status") || "draft",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase
    .from("courses")
    .insert({ ...parsed.data, community_id: COMMUNITY_ID, created_by: profile.id })
    .select("id")
    .single();
  if (error) return { ok: false, error: error.message };

  revalidatePath("/courses");
  revalidatePath("/admin/courses");
  return { ok: true, id: data.id };
}

export async function updateCourseAction(courseId: string, formData: FormData): Promise<Result> {
  await requireModerator();
  const parsed = courseSchema.partial().safeParse({
    title: formData.get("title"),
    slug: formData.get("slug"),
    description: formData.get("description"),
    cover_url: formData.get("cover_url"),
    status: formData.get("status"),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { error } = await supabase.from("courses").update(parsed.data).eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/courses");
  revalidatePath(`/courses/${courseId}`);
  revalidatePath("/admin/courses");
  return { ok: true, id: courseId };
}

export async function deleteCourseAction(courseId: string): Promise<Result> {
  await requireModerator();
  const supabase = await createClient();
  const { error } = await supabase.from("courses").delete().eq("id", courseId);
  if (error) return { ok: false, error: error.message };
  revalidatePath("/courses");
  revalidatePath("/admin/courses");
  return { ok: true };
}

export async function createModuleAction(formData: FormData): Promise<Result> {
  await requireModerator();
  const parsed = moduleSchema.safeParse({
    course_id: formData.get("course_id"),
    title: formData.get("title"),
    description: formData.get("description") || null,
    order_index: Number(formData.get("order_index") || 0),
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("course_modules").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: error.message };
  revalidatePath(`/courses/${parsed.data.course_id}`);
  revalidatePath("/admin/courses");
  return { ok: true, id: data.id };
}

export async function createLessonAction(formData: FormData): Promise<Result> {
  await requireModerator();
  const parsed = lessonSchema.safeParse({
    module_id: formData.get("module_id"),
    course_id: formData.get("course_id"),
    title: formData.get("title"),
    description: formData.get("description") || null,
    video_url: formData.get("video_url") || null,
    video_storage_path: formData.get("video_storage_path") || null,
    content: formData.get("content") || null,
    attachment_url: formData.get("attachment_url") || null,
    order_index: Number(formData.get("order_index") || 0),
    duration_seconds: Number(formData.get("duration_seconds") || 0),
    is_free: formData.get("is_free") === "on",
  });
  if (!parsed.success) return { ok: false, error: parsed.error.issues[0]?.message ?? "Dados inválidos" };

  const supabase = await createClient();
  const { data, error } = await supabase.from("lessons").insert(parsed.data).select("id").single();
  if (error) return { ok: false, error: error.message };

  revalidatePath(`/courses/${parsed.data.course_id}`);
  revalidatePath("/admin/courses");
  return { ok: true, id: data.id };
}

export async function markLessonCompleteAction(lessonId: string, courseId: string): Promise<Result> {
  const profile = await requireProfile();
  if (profile.is_banned) return { ok: false, error: "Usuário banido." };

  const supabase = await createClient();
  const { error } = await supabase
    .from("lesson_progress")
    .upsert(
      {
        lesson_id: lessonId,
        course_id: courseId,
        user_id: profile.id,
        completed: true,
        completed_at: new Date().toISOString(),
      },
      { onConflict: "lesson_id,user_id" },
    );
  if (error) return { ok: false, error: error.message };

  await awardPoints(profile.id, "lesson_completed", POINTS.LESSON_COMPLETED, "lesson", lessonId);

  revalidatePath(`/courses/${courseId}`);
  revalidatePath(`/courses/${courseId}/lessons/${lessonId}`);
  return { ok: true };
}
