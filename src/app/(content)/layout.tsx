import Link from "next/link";
import { Logo } from "@/components/shared/logo";

/**
 * Layout PUBLICO (sem gate) das paginas de detalhe da Biblioteca. Deslogado ve o
 * preview; logado ve o conteudo completo. Chroma minima e focada no conteudo — a
 * navegacao do app fica no modal interceptado (dentro do grid) e no link "voltar".
 */
export default function ContentLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="mx-auto max-w-3xl px-4 py-8 md:px-6">
      <Link href="/" className="mb-6 inline-flex items-center">
        <Logo className="h-6 w-auto" />
      </Link>
      {children}
    </div>
  );
}
