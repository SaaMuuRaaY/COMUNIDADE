import Link from "next/link";
import { Button } from "@/components/ui/button";

/**
 * Not-found DA ÁREA LOGADA: "voltar ao início" leva à Comunidade, não à landing
 * pública (o `src/app/not-found.tsx` global aponta para "/"). É o que o usuário vê,
 * por exemplo, ao abrir um post que ele mesmo acabou de excluir.
 */
export default function AppNotFound() {
  return (
    <div className="flex min-h-[60vh] flex-col items-center justify-center gap-4 p-8 text-center">
      <h1 className="text-3xl font-semibold tracking-tight">Publicação indisponível</h1>
      <p className="text-muted-foreground">Esta página não existe, foi movida ou removida.</p>
      <Button asChild>
        <Link href="/community">Voltar à Comunidade</Link>
      </Button>
    </div>
  );
}
