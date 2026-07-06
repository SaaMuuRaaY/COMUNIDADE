import Link from "next/link";
import { Card, CardContent } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { CategoryBadge } from "@/components/resources/category-badge";
import type { LibraryPreview } from "@/server/queries/library";

/**
 * Preview PUBLICO (deslogado) de um item da Biblioteca: capa + titulo + trecho +
 * CTA de registro/login com o `next` embutido (volta ao conteudo apos entrar).
 * NUNCA renderiza o payload (download/link/embed) — isso e so pra quem loga.
 */
export function PublicItemPreview({ preview, next }: { preview: LibraryPreview; next: string }) {
  const registerHref = `/register?next=${encodeURIComponent(next)}`;
  const loginHref = `/login?next=${encodeURIComponent(next)}`;
  const label = preview.kind === "resource" ? "este recurso" : "este aplicativo";

  return (
    <Card className="overflow-hidden">
      {preview.cover_url ? (
        // eslint-disable-next-line @next/next/no-img-element
        <img
          src={preview.cover_url}
          alt={preview.title}
          className="aspect-video w-full object-cover"
        />
      ) : null}
      <CardContent className="space-y-4 p-5 md:p-6">
        {preview.kind === "resource" ? (
          <CategoryBadge category={preview.category} className="w-fit" />
        ) : null}
        <h1 className="text-2xl font-semibold tracking-tight">{preview.title}</h1>
        {preview.teaser ? <p className="text-sm text-muted-foreground">{preview.teaser}</p> : null}

        <div className="rounded-lg border border-[var(--accent-line)] bg-muted/40 p-4">
          <p className="text-sm font-medium">Conteúdo da comunidade</p>
          <p className="mt-1 text-sm text-muted-foreground">
            Crie sua conta (grátis) para acessar {label} completo e todo o resto do Portal Nexus.
          </p>
          <div className="mt-3 flex flex-wrap gap-2">
            <Button asChild>
              <Link href={registerHref}>Criar conta e acessar</Link>
            </Button>
            <Button asChild variant="outline">
              <Link href={loginHref}>Já tenho conta</Link>
            </Button>
          </div>
        </div>
      </CardContent>
    </Card>
  );
}
