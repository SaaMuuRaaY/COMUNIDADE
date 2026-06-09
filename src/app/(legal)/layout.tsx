import Link from "next/link";
import { Hexagon } from "lucide-react";

export default function LegalLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-6 py-10">
      <Link href="/" className="mb-8 inline-flex items-center gap-2 text-sm font-semibold">
        <Hexagon className="h-5 w-5" /> CODEX Community
      </Link>
      <article className="space-y-3 text-sm leading-relaxed text-muted-foreground [&_h1]:text-2xl [&_h1]:font-semibold [&_h1]:text-foreground [&_h2]:mt-6 [&_h2]:text-base [&_h2]:font-semibold [&_h2]:text-foreground">
        {children}
      </article>
    </div>
  );
}
