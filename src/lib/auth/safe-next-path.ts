/**
 * Garante que o destino pos-login e um caminho INTERNO, evitando open redirect.
 * Rejeita URLs absolutas (`https://...`), protocol-relative (`//host`) e backslash
 * tricks (`/\host`). Fallback seguro: /dashboard.
 *
 * FONTE UNICA — reusada pelo callback de auth E pelas actions login/register.
 */
export function safeNextPath(next: string | null): string {
  if (!next || !next.startsWith("/")) return "/dashboard";
  if (next.startsWith("//") || next.startsWith("/\\")) return "/dashboard";
  return next;
}
