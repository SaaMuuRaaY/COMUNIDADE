import Link from "next/link";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import type { SectionBannerConfig } from "@/lib/section-banners";

/**
 * Cabeçalho contextual reutilizável por área (Fase 4A). Estética Nexus:
 * card + tokens accent, neon moderado (glow sutil só no variant "featured"),
 * mantendo legibilidade. `children` permite injetar conteúdo dinâmico
 * (ex.: a posição do usuário no ranking) sem quebrar a config local.
 */
export function SectionBanner({
  eyebrow,
  title,
  description,
  icon: Icon,
  iconNode,
  cta,
  variant = "default",
  children,
}: SectionBannerConfig & { children?: React.ReactNode; iconNode?: React.ReactNode }) {
  const featured = variant === "featured";

  return (
    <div
      className={cn(
        "relative overflow-hidden rounded-xl border p-5 md:p-6",
        featured
          ? "border-[var(--accent-line)] bg-card shadow-[0_0_50px_-18px_var(--accent-glow)]"
          : "border-border bg-card/60",
      )}
    >
      {featured ? (
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(70% 100% at 0% 0%, var(--accent-glow), transparent 65%)" }}
        />
      ) : null}

      <div className="relative flex items-start gap-4">
        {iconNode || Icon ? (
          <div className="hidden h-11 w-11 shrink-0 items-center justify-center rounded-lg bg-muted text-[var(--accent)] ring-1 ring-[var(--accent-line)] sm:flex">
            {iconNode ? iconNode : Icon ? <Icon className="h-5 w-5" /> : null}
          </div>
        ) : null}

        <div className="min-w-0 flex-1 space-y-1">
          {eyebrow ? (
            <p className="text-xs font-medium uppercase tracking-wide text-[var(--accent)]">{eyebrow}</p>
          ) : null}
          <h1 className="text-2xl font-semibold tracking-tight">{title}</h1>
          <p className="text-sm text-muted-foreground">{description}</p>
          {children ? <div className="pt-1 text-sm text-muted-foreground">{children}</div> : null}
        </div>

        {cta ? (
          <Button asChild size="sm" className="hidden shrink-0 sm:inline-flex">
            <Link href={cta.href}>{cta.label}</Link>
          </Button>
        ) : null}
      </div>
    </div>
  );
}
