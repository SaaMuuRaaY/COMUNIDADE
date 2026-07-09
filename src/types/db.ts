/**
 * Fachada de tipos do Supabase.
 *
 * A verdade estrutural do schema vive em `database.generated.ts` — gerado pela
 * CLI oficial do Supabase (`pnpm db:types`). NÃO editar o gerado à mão.
 *
 * Este arquivo é uma fachada fina: reexporta `Database`/`Json`, expõe helpers
 * (`Tables`/`Insertable`/`Updatable`) e deriva os aliases de tabela do schema
 * gerado. As colunas de "enum" no banco são `text` + CHECK (não enum nativo),
 * então o gerado as entrega como `string`; a aplicação as **estreita** para as
 * uniões de domínio abaixo (mesma prática do stub anterior, agora sobre o
 * schema real). `social_links` é `jsonb` no banco e refinado para `SocialLinks`.
 */
import type { Database, Json } from "./database.generated";

export type { Database, Json };

export type Tables<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Row"];
export type Insertable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Insert"];
export type Updatable<T extends keyof Database["public"]["Tables"]> =
  Database["public"]["Tables"][T]["Update"];

// --- Refinamentos de domínio (colunas `text`+CHECK / `jsonb`) -----------------
export type Role = "admin" | "moderator" | "member";
export type ResourceCategory =
  | "apostilas"
  | "templates"
  | "planilhas"
  | "codigos"
  | "checklists"
  | "ferramentas";
export type AppCategory =
  | "ia"
  | "programacao"
  | "automacao"
  | "produtividade"
  | "marketing"
  | "comunidade"
  | "ferramentas-internas";
export type AppType = "link" | "embed" | "file" | "internal";
export type AppStatus = "active" | "coming-soon" | "beta";
export type EventType = "live" | "mentoria" | "aula" | "desafio" | "reuniao";
export type PointsAction =
  | "post_created"
  | "comment_created"
  | "like_received"
  | "lesson_completed"
  | "event_attended"
  | "admin_adjustment"
  | "signup"
  | "onboarding_completed"
  | "first_introduction";
export type SocialPlatform = "instagram" | "tiktok" | "linkedin" | "github" | "youtube";
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

// --- Aliases de tabela (derivados do gerado; enums re-estreitados p/ a UI) -----
export type Profile = Omit<Tables<"profiles">, "role" | "social_links"> & {
  role: Role;
  social_links: SocialLinks;
};
export type Community = Omit<Tables<"communities">, "visibility"> & {
  visibility: "public" | "private";
};
export type Post = Tables<"posts">;
export type PostComment = Tables<"post_comments">;
export type PostLike = Tables<"post_likes">;
export type PostReaction = Tables<"post_reactions">;
export type Course = Omit<Tables<"courses">, "status"> & { status: "draft" | "published" };
export type CourseModule = Tables<"course_modules">;
export type Lesson = Tables<"lessons">;
export type LessonProgress = Tables<"lesson_progress">;
export type Resource = Omit<Tables<"resources">, "category"> & { category: ResourceCategory };
export type App = Omit<Tables<"apps">, "category" | "type" | "status"> & {
  category: AppCategory;
  type: AppType;
  status: AppStatus;
};
export type Event = Omit<Tables<"events">, "event_type"> & { event_type: EventType };
export type EventAttendee = Omit<Tables<"event_attendees">, "status"> & {
  status: "going" | "maybe" | "declined";
};
export type PointsLedgerEntry = Omit<Tables<"points_ledger">, "action"> & {
  action: PointsAction;
};
export type Notification = Tables<"notifications">;
