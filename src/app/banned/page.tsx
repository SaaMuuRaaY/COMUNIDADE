import { redirect } from "next/navigation";
import { ShieldX } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { getCurrentProfile } from "@/lib/auth/current-user";
import { logoutAction } from "@/server/actions/auth";

export const metadata = { title: "Conta bloqueada · Portal Nexus" };

export default async function BannedPage() {
  // Quem não está banido não deve ver esta tela (evita confusão e loop).
  const profile = await getCurrentProfile();
  if (profile && !profile.is_banned) redirect("/dashboard");

  return (
    <main className="relative flex min-h-screen items-center justify-center overflow-hidden bg-background p-6">
      <Card className="w-full max-w-md">
        <CardContent className="space-y-5 p-8 text-center">
          <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-destructive/10 text-destructive">
            <ShieldX className="h-6 w-6" />
          </div>
          <div className="space-y-2">
            <h1 className="text-xl font-semibold tracking-tight">Sua conta foi bloqueada.</h1>
            <p className="text-sm text-muted-foreground">
              Se acredita que isso foi um erro, entre em contato com o suporte.
            </p>
          </div>
          <form action={logoutAction}>
            <Button type="submit" variant="outline" className="w-full">
              Sair
            </Button>
          </form>
        </CardContent>
      </Card>
    </main>
  );
}
