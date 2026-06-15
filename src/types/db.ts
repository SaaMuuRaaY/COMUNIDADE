/**
 * Tipos do banco. Em produção, gerar com:
 *   pnpm supabase gen types typescript --local > src/types/db.ts
 *
 * Este stub mantém o app compilando antes da geração e descreve o schema atual.
 */

export type Role = "admin" | "moderator" | "member";

export type PostCategory =
  | "geral"
  | "duvidas"
  | "apresentacoes"
  | "resultados"
  | "projetos"
  | "avisos"
  | "suporte";

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
  | "event_attended";

export type SocialPlatform = "instagram" | "tiktok" | "linkedin" | "github" | "youtube";
export type SocialLinks = Partial<Record<SocialPlatform, string>>;

export interface Profile {
  id: string;
  full_name: string | null;
  username: string | null;
  avatar_url: string | null;
  bio: string | null;
  role: Role;
  points: number;
  level: number;
  is_banned: boolean;
  is_owner: boolean;
  social_links: SocialLinks;
  created_at: string;
  updated_at: string;
}

export interface Community {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logo_url: string | null;
  primary_color: string | null;
  visibility: "public" | "private";
  created_at: string;
}

export interface Post {
  id: string;
  community_id: string;
  author_id: string;
  category: PostCategory;
  title: string | null;
  body: string;
  media_url: string | null;
  media_type: string | null;
  attachment_url: string | null;
  is_pinned: boolean;
  is_deleted: boolean;
  created_at: string;
  updated_at: string;
}

export interface PostComment {
  id: string;
  post_id: string;
  author_id: string;
  parent_id: string | null;
  body: string;
  is_deleted: boolean;
  created_at: string;
}

export interface PostLike {
  id: string;
  post_id: string;
  user_id: string;
  created_at: string;
}

export interface Course {
  id: string;
  community_id: string;
  title: string;
  slug: string;
  description: string | null;
  cover_url: string | null;
  status: "draft" | "published";
  order_index: number;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface CourseModule {
  id: string;
  course_id: string;
  title: string;
  description: string | null;
  order_index: number;
  created_at: string;
}

export interface Lesson {
  id: string;
  module_id: string;
  course_id: string;
  title: string;
  description: string | null;
  video_url: string | null;
  video_storage_path: string | null;
  content: string | null;
  attachment_url: string | null;
  order_index: number;
  duration_seconds: number;
  is_free: boolean;
  created_at: string;
  updated_at: string;
}

export interface LessonProgress {
  id: string;
  lesson_id: string;
  course_id: string;
  user_id: string;
  completed: boolean;
  completed_at: string | null;
  created_at: string;
}

export interface Resource {
  id: string;
  title: string;
  description: string | null;
  category: ResourceCategory;
  file_url: string | null;
  file_storage_path: string | null;
  file_type: string | null;
  created_by: string | null;
  created_at: string;
}

export interface App {
  id: string;
  name: string;
  description: string | null;
  category: AppCategory;
  type: AppType;
  status: AppStatus;
  url: string | null;
  embed_url: string | null;
  file_url: string | null;
  icon_url: string | null;
  created_by: string | null;
  created_at: string;
  updated_at: string;
}

export interface Event {
  id: string;
  title: string;
  description: string | null;
  event_type: EventType;
  starts_at: string;
  ends_at: string | null;
  external_url: string | null;
  created_by: string | null;
  created_at: string;
}

export interface EventAttendee {
  id: string;
  event_id: string;
  user_id: string;
  status: "going" | "maybe" | "declined";
  created_at: string;
}

export interface PointsLedgerEntry {
  id: string;
  user_id: string;
  action: PointsAction;
  points: number;
  reference_type: string | null;
  reference_id: string | null;
  created_at: string;
}

export interface Notification {
  id: string;
  user_id: string;
  title: string;
  body: string | null;
  type: string;
  read_at: string | null;
  created_at: string;
}

/**
 * Schema permissivo para MVP — quando o app for ligado ao Supabase real,
 * gere tipos exatos com:
 *   pnpm db:types
 *
 * O `Database` abaixo é intencionalmente "any-friendly" no schema das
 * tabelas — assim o supabase-js aceita Insert/Update parciais sem fricção
 * com o stub local, mas as queries continuam tipadas via as Row interfaces
 * exportadas acima.
 */
// eslint-disable-next-line @typescript-eslint/no-explicit-any
type GenericTable<Row extends object = any> = {
  Row: Row;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Insert: any;
  // eslint-disable-next-line @typescript-eslint/no-explicit-any
  Update: any;
};

export interface Database {
  public: {
    Tables: {
      profiles: GenericTable<Profile>;
      communities: GenericTable<Community>;
      community_members: GenericTable<{ id: string; community_id: string; user_id: string; role: Role; joined_at: string }>;
      posts: GenericTable<Post>;
      post_comments: GenericTable<PostComment>;
      post_likes: GenericTable<PostLike>;
      courses: GenericTable<Course>;
      course_modules: GenericTable<CourseModule>;
      lessons: GenericTable<Lesson>;
      lesson_progress: GenericTable<LessonProgress>;
      lesson_comments: GenericTable<{ id: string; lesson_id: string; author_id: string; body: string; is_deleted: boolean; created_at: string }>;
      resources: GenericTable<Resource>;
      apps: GenericTable<App>;
      events: GenericTable<Event>;
      event_attendees: GenericTable<EventAttendee>;
      points_ledger: GenericTable<PointsLedgerEntry>;
      notifications: GenericTable<Notification>;
      settings: GenericTable<{ key: string; value: unknown; updated_at: string }>;
    };
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Views: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Functions: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    Enums: Record<string, any>;
    // eslint-disable-next-line @typescript-eslint/no-explicit-any
    CompositeTypes: Record<string, any>;
  };
}
