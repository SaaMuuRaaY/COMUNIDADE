import type {
  AppCategory,
  AppStatus,
  AppType,
  EventType,
  ResourceCategory,
} from "@/types/db";

export const COMMUNITY_ID = "aaaaaaaa-aaaa-aaaa-aaaa-aaaaaaaaaaaa";

export const RESOURCE_CATEGORIES: { value: ResourceCategory; label: string }[] = [
  { value: "apostilas", label: "Apostilas" },
  { value: "templates", label: "Templates" },
  { value: "planilhas", label: "Planilhas" },
  { value: "codigos", label: "Códigos" },
  { value: "checklists", label: "Checklists" },
  { value: "ferramentas", label: "Ferramentas" },
];

export const APP_CATEGORIES: { value: AppCategory; label: string }[] = [
  { value: "ia", label: "IA" },
  { value: "programacao", label: "Programação" },
  { value: "automacao", label: "Automação" },
  { value: "produtividade", label: "Produtividade" },
  { value: "marketing", label: "Marketing" },
  { value: "comunidade", label: "Comunidade" },
  { value: "ferramentas-internas", label: "Ferramentas internas" },
];

export const APP_TYPES: { value: AppType; label: string }[] = [
  { value: "link", label: "Link externo" },
  { value: "embed", label: "Embed" },
  { value: "file", label: "Arquivo" },
  { value: "internal", label: "Ferramenta interna" },
];

export const APP_STATUSES: { value: AppStatus; label: string }[] = [
  { value: "active", label: "Ativo" },
  { value: "coming-soon", label: "Em breve" },
  { value: "beta", label: "Beta" },
];

export const EVENT_TYPES: { value: EventType; label: string }[] = [
  { value: "live", label: "Live" },
  { value: "mentoria", label: "Mentoria" },
  { value: "aula", label: "Aula" },
  { value: "desafio", label: "Desafio" },
  { value: "reuniao", label: "Reunião" },
];

export const LEVEL_THRESHOLDS = [0, 100, 300, 700, 1500] as const;

export function levelFromPoints(points: number): number {
  if (points >= 1500) return 5;
  if (points >= 700) return 4;
  if (points >= 300) return 3;
  if (points >= 100) return 2;
  return 1;
}

export function nextLevelThreshold(points: number): number | null {
  for (const t of LEVEL_THRESHOLDS) {
    if (t > points) return t;
  }
  return null;
}

export const POINTS = {
  POST_CREATED: 10,
  COMMENT_CREATED: 5,
  LIKE_RECEIVED: 2,
  LESSON_COMPLETED: 15,
  EVENT_ATTENDED: 20,
} as const;

export const REACTION_EMOJIS = ["👍", "❤️", "😂", "🎉", "🔥", "😮"] as const;
export type ReactionEmoji = (typeof REACTION_EMOJIS)[number];

export const AVATAR_MAX_BYTES = 5 * 1024 * 1024; // 5MB (bucket avatars)
export const POST_IMAGE_MAX_BYTES = 10 * 1024 * 1024; // 10MB (bucket post-media)

export const BLOCKED_EXTENSIONS = ["exe", "bat", "cmd", "sh", "dmg", "msi", "scr", "vbs"];
export const ALLOWED_DOC_EXTENSIONS = [
  "pdf", "zip", "doc", "docx", "xls", "xlsx", "ppt", "pptx",
  "png", "jpg", "jpeg", "webp", "gif", "txt", "md",
  "js", "ts", "tsx", "jsx", "py", "html", "css", "json",
];

export const SAFE_EMBED_HOSTS = [
  "youtube.com", "www.youtube.com", "youtu.be",
  "youtube-nocookie.com",
  "vimeo.com", "player.vimeo.com",
  "loom.com", "www.loom.com",
  "docs.google.com",
  "codepen.io", "codesandbox.io",
  "github.com",
  "localhost", "127.0.0.1",
];
