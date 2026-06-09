import { CourseFormNew } from "./course-form-new";

export const metadata = { title: "Novo curso" };

export default function NewCoursePage() {
  return (
    <div className="mx-auto max-w-2xl space-y-4 p-4 md:p-6">
      <h1 className="text-2xl font-semibold tracking-tight">Novo curso</h1>
      <CourseFormNew />
    </div>
  );
}
