import { ALLOWED_DOC_EXTENSIONS, BLOCKED_EXTENSIONS, SAFE_EMBED_HOSTS } from "@/lib/constants";

export function getExtension(filename: string): string {
  const parts = filename.toLowerCase().split(".");
  return parts.length > 1 ? parts.pop() ?? "" : "";
}

export function isExtensionAllowed(filename: string, opts?: { allowAll?: boolean }): boolean {
  const ext = getExtension(filename);
  if (!ext) return false;
  if (BLOCKED_EXTENSIONS.includes(ext)) return false;
  if (opts?.allowAll) return true;
  return ALLOWED_DOC_EXTENSIONS.includes(ext);
}

export function isSafeEmbedUrl(url: string): boolean {
  try {
    const u = new URL(url);
    if (u.protocol !== "https:" && u.protocol !== "http:") return false;
    return SAFE_EMBED_HOSTS.some(
      (host) => u.hostname === host || u.hostname.endsWith(`.${host}`),
    );
  } catch {
    return false;
  }
}

export function safeStoragePath(userId: string, filename: string): string {
  const ext = getExtension(filename);
  const ts = Date.now();
  const safeBase = filename
    .toLowerCase()
    .replace(/\.[^.]+$/, "")
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 40);
  return `${userId}/${ts}-${safeBase}${ext ? `.${ext}` : ""}`;
}
