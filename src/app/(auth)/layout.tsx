import Link from "next/link";
import { Logo } from "@/components/shared/logo";

export default function AuthLayout({ children }: { children: React.ReactNode }) {
  return (
    <div className="grid min-h-screen md:grid-cols-2">
      <div className="relative hidden flex-col justify-between overflow-hidden border-r border-[var(--accent-line)] bg-[var(--bg-inset)] p-10 text-foreground md:flex">
        <div
          aria-hidden
          className="pointer-events-none absolute inset-0"
          style={{ background: "radial-gradient(80% 60% at 0% 0%, var(--accent-glow), transparent 60%)" }}
        />
        <Link href="/" className="relative flex items-center">
          <Logo className="h-8 w-auto" priority />
        </Link>
        <div className="relative space-y-2">
          <p className="text-2xl font-medium leading-tight">
            Sua comunidade. Seus cursos. Seus recursos.
          </p>
          <p className="text-sm text-muted-foreground">
            Plataforma própria para crescer com audiência, conteúdo e network.
          </p>
          <p className="pt-4 text-xs text-muted-foreground">
            <Link href="/termos" className="hover:text-foreground hover:underline">
              Termos de Uso
            </Link>
            <span className="px-2">·</span>
            <Link href="/privacidade" className="hover:text-foreground hover:underline">
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
