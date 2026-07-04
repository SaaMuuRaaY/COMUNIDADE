import { z } from "zod";
import { isValidPostCategory } from "@/lib/community/structure";

/**
 * Aceita só URLs https públicas para imagens fornecidas pelo usuário (avatar),
 * bloqueando localhost e faixas de IP privadas/loopback (mitiga SSRF via next/image).
 */
function isSafePublicImageUrl(u: string): boolean {
  try {
    const url = new URL(u);
    if (url.protocol !== "https:") return false;
    const host = url.hostname.toLowerCase();
    if (host === "localhost" || host.endsWith(".local") || host === "[::1]") return false;
    if (/^(127\.|10\.|192\.168\.|169\.254\.|0\.)/.test(host)) return false;
    if (/^172\.(1[6-9]|2\d|3[01])\./.test(host)) return false;
    if (host.startsWith("[fc") || host.startsWith("[fd")) return false;
    return true;
  } catch {
    return false;
  }
}

export const loginSchema = z.object({
  email: z.string().email("E-mail inválido"),
  password: z.string().min(6, "Mínimo 6 caracteres"),
});
export type LoginInput = z.infer<typeof loginSchema>;

export const registerSchema = z.object({
  full_name: z.string().min(2, "Informe seu nome"),
  email: z.string().email("E-mail inválido"),
  password: z.string().min(8, "Mínimo 8 caracteres"),
});
export type RegisterInput = z.infer<typeof registerSchema>;

export const forgotPasswordSchema = z.object({
  email: z.string().email("E-mail inválido"),
});
export type ForgotPasswordInput = z.infer<typeof forgotPasswordSchema>;

export const profileUpdateSchema = z.object({
  full_name: z.string().min(2).max(80),
  username: z
    .string()
    .min(3)
    .max(30)
    .regex(/^[a-z0-9_]+$/i, "Use letras, números e _"),
  bio: z.string().max(280).optional().nullable(),
  avatar_url: z
    .string()
    .url()
    .refine(isSafePublicImageUrl, "Use uma URL https pública de imagem")
    .optional()
    .nullable(),
});
export type ProfileUpdateInput = z.infer<typeof profileUpdateSchema>;

// Redes sociais (Fase 4B-1): cada link deve ser uma URL https do host da própria
// plataforma — evita open-redirect/abuso. Campo vazio = ausente.
const SOCIAL_HOSTS = {
  instagram: ["instagram.com"],
  tiktok: ["tiktok.com"],
  linkedin: ["linkedin.com"],
  github: ["github.com"],
  youtube: ["youtube.com", "youtu.be"],
} as const;

function platformUrl(hosts: readonly string[]) {
  return z.preprocess(
    (v) => (typeof v === "string" && v.trim() === "" ? undefined : v),
    z
      .string()
      .max(200)
      .url()
      .refine((u) => {
        try {
          const url = new URL(u);
          if (url.protocol !== "https:") return false;
          const host = url.hostname.toLowerCase().replace(/^www\./, "");
          return hosts.some((d) => host === d || host.endsWith(`.${d}`));
        } catch {
          return false;
        }
      }, "Use o link https do seu perfil nessa rede.")
      .optional(),
  );
}

export const socialLinksSchema = z.object({
  instagram: platformUrl(SOCIAL_HOSTS.instagram),
  tiktok: platformUrl(SOCIAL_HOSTS.tiktok),
  linkedin: platformUrl(SOCIAL_HOSTS.linkedin),
  github: platformUrl(SOCIAL_HOSTS.github),
  youtube: platformUrl(SOCIAL_HOSTS.youtube),
});
export type SocialLinksInput = z.infer<typeof socialLinksSchema>;

export const postCategoryEnum = z.enum([
  "geral",
  "duvidas",
  "apresentacoes",
  "resultados",
  "projetos",
  "avisos",
  "suporte",
]);

export const postSchema = z.object({
  // Transitório (Fases 3–4): aceita canais novos + categorias antigas. Na Fase 5
  // (após o remap) estreita para só canais novos (isKnownChannelSlug).
  category: z.string().refine((s) => isValidPostCategory(s), "Canal inválido"),
  title: z.string().max(160).optional().nullable(),
  body: z.string().min(2, "Conteúdo muito curto").max(8000, "Conteúdo muito longo"),
  media_url: z.string().url().optional().nullable(),
  media_type: z.string().optional().nullable(),
  attachment_url: z.string().url().optional().nullable(),
});
export type PostInput = z.infer<typeof postSchema>;

export const commentSchema = z.object({
  post_id: z.string().uuid(),
  parent_id: z.string().uuid().optional().nullable(),
  body: z.string().min(1).max(2000),
});
export type CommentInput = z.infer<typeof commentSchema>;

// Chat em tempo real (FEATURE 02) — mensagem da sala da comunidade.
export const messageSchema = z.object({
  body: z.string().trim().min(1, "Mensagem vazia").max(2000, "Mensagem muito longa"),
});
export type MessageInput = z.infer<typeof messageSchema>;

// Direct Messages (FEATURE 03) — denúncia de conversa.
export const reportSchema = z.object({
  reason: z.string().trim().min(3, "Descreva o motivo").max(500, "Motivo muito longo"),
});
export type ReportInput = z.infer<typeof reportSchema>;

export const courseSchema = z.object({
  title: z.string().min(3).max(120),
  slug: z.string().min(3).max(120).regex(/^[a-z0-9-]+$/),
  description: z.string().max(2000).optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
  status: z.enum(["draft", "published"]).default("draft"),
});
export type CourseInput = z.infer<typeof courseSchema>;

export const moduleSchema = z.object({
  course_id: z.string().uuid(),
  title: z.string().min(2).max(120),
  description: z.string().max(500).optional().nullable(),
  order_index: z.number().int().min(0).default(0),
});
export type ModuleInput = z.infer<typeof moduleSchema>;

export const lessonSchema = z.object({
  module_id: z.string().uuid(),
  course_id: z.string().uuid(),
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional().nullable(),
  video_url: z.string().url().optional().nullable(),
  video_storage_path: z.string().optional().nullable(),
  content: z.string().max(20000).optional().nullable(),
  attachment_url: z.string().url().optional().nullable(),
  order_index: z.number().int().min(0).default(0),
  duration_seconds: z.number().int().min(0).default(0),
  is_free: z.boolean().default(false),
});
export type LessonInput = z.infer<typeof lessonSchema>;

export const resourceSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(1000).optional().nullable(),
  category: z.enum(["apostilas", "templates", "planilhas", "codigos", "checklists", "ferramentas"]),
  file_url: z.string().url().optional().nullable(),
  file_storage_path: z.string().optional().nullable(),
  file_type: z.string().optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
});
export type ResourceInput = z.infer<typeof resourceSchema>;

export const appSchema = z.object({
  name: z.string().min(2).max(120),
  description: z.string().max(1000).optional().nullable(),
  category: z.enum([
    "ia",
    "programacao",
    "automacao",
    "produtividade",
    "marketing",
    "comunidade",
    "ferramentas-internas",
  ]),
  type: z.enum(["link", "embed", "file", "internal"]),
  status: z.enum(["active", "coming-soon", "beta"]),
  url: z.string().url().optional().nullable(),
  embed_url: z.string().url().optional().nullable(),
  file_url: z.string().url().optional().nullable(),
  icon_url: z.string().url().optional().nullable(),
  cover_url: z.string().url().optional().nullable(),
});
export type AppInput = z.infer<typeof appSchema>;

export const eventSchema = z.object({
  title: z.string().min(2).max(160),
  description: z.string().max(2000).optional().nullable(),
  event_type: z.enum(["live", "mentoria", "aula", "desafio", "reuniao"]),
  starts_at: z.string().datetime(),
  ends_at: z.string().datetime().optional().nullable(),
  external_url: z.string().url().optional().nullable(),
});
export type EventInput = z.infer<typeof eventSchema>;
