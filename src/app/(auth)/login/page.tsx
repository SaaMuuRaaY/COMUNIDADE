import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;
  const registerHref = next ? `/register?next=${encodeURIComponent(next)}` : "/register";

  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta para continuar.</p>
      </div>
      <LoginForm next={next} />
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
          Esqueci a senha
        </Link>
        <Link href={registerHref} className="font-medium underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </div>
    </>
  );
}
