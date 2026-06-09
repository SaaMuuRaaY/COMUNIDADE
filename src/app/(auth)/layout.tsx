import Link from "next/link";
import { Hexagon } from "lucide-react";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="hidden flex-col justify-between bg-zinc-950 p-10 text-zinc-100 md:flex">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Hexagon className="h-6 w-6" />
          CODEX Community
        </Link>
        <div className="space-y-2">
          <p className="text-2xl font-medium leading-tight">
            Sua comunidade. Seus cursos. Seus recursos.
          </p>
          <p className="text-sm text-zinc-400">
            Plataforma própria para crescer com audiência, conteúdo e network.
          </p>
          <p className="pt-4 text-xs text-zinc-500">
            <Link href="/termos" className="hover:underline">
              Termos de Uso
            </Link>
            <span className="px-2">·</span>
            <Link href="/privacidade" className="hover:underline">
              Privacidade
            </Link>
          </p>
        </div>
      </div>
      <div className="flex items-center justify-center px-6 py-10">
        <div className="w-full max-w-sm space-y-6">{children}</div>
      </div>
    </div>
  );
}
