import { ExternalLink } from "lucide-react";
import { cn } from "@/lib/utils";
import type { SocialLinks as SocialLinksMap, SocialPlatform } from "@/types/db";

const LABELS: Record<SocialPlatform, string> = {
  instagram: "Instagram",
  tiktok: "TikTok",
  linkedin: "LinkedIn",
  github: "GitHub",
  youtube: "YouTube",
};

const ORDER: SocialPlatform[] = ["instagram", "tiktok", "linkedin", "github", "youtube"];

/** Defesa extra: só renderiza href https válido (além da validação por host no save). */
function safeHttps(url: string): string | null {
  try {
    const u = new URL(url);
    return u.protocol === "https:" ? u.href : null;
  } catch {
    return null;
  }
}

export function SocialLinks({
  links,
  className,
}: {
  links?: SocialLinksMap | null;
  className?: string;
}) {
  if (!links) return null;
  const items = ORDER.map((p) => ({ p, href: links[p] ? safeHttps(links[p]!) : null })).filter(
    (i): i is { p: SocialPlatform; href: string } => !!i.href,
  );
  if (!items.length) return null;

  return (
    <div className={cn("flex flex-wrap items-center gap-2", className)}>
      {items.map(({ p, href }) => (
        <a
          key={p}
          href={href}
          target="_blank"
          rel="noopener noreferrer nofollow"
          title={LABELS[p]}
          className="inline-flex items-center gap-1 rounded-md border border-border px-2 py-1 text-xs text-muted-foreground transition-colors hover:border-[var(--accent-line)] hover:text-[var(--accent)]"
        >
          {LABELS[p]}
          <ExternalLink className="h-3 w-3" />
        </a>
      ))}
    </div>
  );
}
