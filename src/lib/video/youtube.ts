// IDs de video do YouTube tem exatamente 11 caracteres do alfabeto base64url.
const VIDEO_ID = /^[A-Za-z0-9_-]{11}$/;

const YOUTUBE_HOSTS = new Set([
  "youtu.be",
  "youtube.com",
  "www.youtube.com",
  "m.youtube.com",
  "youtube-nocookie.com",
  "www.youtube-nocookie.com",
]);

/**
 * Extrai o ID do video a partir de qualquer formato publico de URL do YouTube.
 * Retorna null para host desconhecido, protocolo perigoso (javascript:, data:)
 * ou ID malformado — o chamador nunca monta um embed a partir de lixo.
 */
export function parseYouTubeId(url: string): string | null {
  let parsed: URL;
  try {
    parsed = new URL(url);
  } catch {
    return null;
  }
  if (parsed.protocol !== "https:" && parsed.protocol !== "http:") return null;
  if (!YOUTUBE_HOSTS.has(parsed.hostname)) return null;

  const [first, second] = parsed.pathname.split("/").filter(Boolean);

  let candidate: string | null | undefined;
  if (parsed.hostname === "youtu.be") candidate = first;
  else if (first === "watch") candidate = parsed.searchParams.get("v");
  else if (first === "shorts" || first === "embed" || first === "live") candidate = second;

  return candidate && VIDEO_ID.test(candidate) ? candidate : null;
}

export function isYouTubeUrl(url: string): boolean {
  return parseYouTubeId(url) !== null;
}

/** Dominio nocookie: o YouTube so grava cookies de rastreamento apos o play. */
export function youTubeEmbedUrl(id: string): string {
  return `https://www.youtube-nocookie.com/embed/${id}?rel=0&playsinline=1&modestbranding=1`;
}
