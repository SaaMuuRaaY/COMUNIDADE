import Link from "next/link";
import { ForgotForm } from "./forgot-form";

export const metadata = { title: "Recuperar senha" };

export default function ForgotPage() {
  return (
    <>
      <div className="space-y-2">
        <h1 className="text-2xl font-semibold tracking-tight">Recuperar senha</h1>
        <p className="text-sm text-muted-foreground">Vamos te ajudar a voltar para a comunidade.</p>
      </div>
      <ForgotForm />
      <p className="text-sm text-muted-foreground">
        Lembrou?{" "}
        <Link href="/login" className="font-medium text-foreground underline-offset-4 hover:underline">
          Voltar para login
        </Link>
      </p>
    </>
  );
}
