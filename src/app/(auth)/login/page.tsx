import Link from "next/link";
import { LoginForm } from "./login-form";

export const metadata = { title: "Entrar" };

export default function LoginPage() {
  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Bem-vindo de volta</h1>
        <p className="text-sm text-muted-foreground">Acesse sua conta para continuar.</p>
      </div>
      <LoginForm />
      <div className="flex items-center justify-between text-sm">
        <Link href="/forgot-password" className="text-muted-foreground hover:text-foreground">
          Esqueci a senha
        </Link>
        <Link href="/register" className="font-medium underline-offset-4 hover:underline">
          Criar conta
        </Link>
      </div>
    </>
  );
}
