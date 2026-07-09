"use client";

import * as React from "react";
import { useRouter } from "next/navigation";
import {
  Sparkles,
  GraduationCap,
  Library,
  LayoutGrid,
  MessagesSquare,
  Calendar,
  Trophy,
  Users,
} from "lucide-react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { markWelcomeTourCompletedAction } from "@/server/actions/onboarding";

const STORAGE_KEY = "nexus-welcome-tour-seen";

const MODULES = [
  { icon: GraduationCap, label: "Cursos e aulas" },
  { icon: Library, label: "Biblioteca de recursos" },
  { icon: LayoutGrid, label: "Aplicativos" },
  { icon: MessagesSquare, label: "Chat Network" },
  { icon: Calendar, label: "Eventos e lives" },
  { icon: Trophy, label: "Ranking e recompensas" },
  { icon: Users, label: "Comunidade e networking" },
];

/**
 * Pop-up de boas-vindas do 1º acesso (3 telas). O dashboard decide exibir
 * (`show` = welcome_tour_completed_at nulo + membro na jornada). Guard de
 * localStorage evita reabrir na mesma sessão (padrão do CookieConsent). O CTA
 * final marca no banco e leva ao formulário.
 */
export function WelcomeTour({ show }: { show: boolean }) {
  const router = useRouter();
  const [open, setOpen] = React.useState(false);
  const [step, setStep] = React.useState(0);
  const [pending, startTransition] = React.useTransition();
  const closedRef = React.useRef(false);

  React.useEffect(() => {
    const id = requestAnimationFrame(() => {
      try {
        if (show && !localStorage.getItem(STORAGE_KEY)) setOpen(true);
      } catch {
        /* localStorage indisponível — não bloqueia */
      }
    });
    return () => cancelAnimationFrame(id);
  }, [show]);

  // Fecha o tour: grava no BANCO (fonte de verdade cross-sessão, robusto a private
  // browsing) + localStorage (sessão) — para qualquer forma de fechar. Idempotente.
  function close(navigate: boolean) {
    if (closedRef.current) {
      if (navigate) router.push("/onboarding");
      return;
    }
    closedRef.current = true;
    try {
      localStorage.setItem(STORAGE_KEY, "1");
    } catch {
      /* ignore */
    }
    setOpen(false);
    startTransition(async () => {
      await markWelcomeTourCompletedAction();
      if (navigate) router.push("/onboarding");
    });
  }

  return (
    <Dialog
      open={open}
      onOpenChange={(o) => {
        if (!o) close(false);
      }}
    >
      <DialogContent className="max-w-md">
        {step === 0 ? (
          <>
            <DialogHeader>
              <DialogTitle className="flex items-center gap-2">
                <Sparkles className="h-5 w-5 text-[var(--accent)]" /> Bem-vindo ao Portal Nexus
              </DialogTitle>
              <DialogDescription>
                Seu cadastro foi concluído e você já recebeu 10 pontos. Aqui, suas participações
                geram pontos, posições no ranking, benefícios e recompensas.
              </DialogDescription>
            </DialogHeader>
            <Button className="w-full" onClick={() => setStep(1)}>
              Conhecer a comunidade
            </Button>
          </>
        ) : step === 1 ? (
          <>
            <DialogHeader>
              <DialogTitle>O que existe no Portal</DialogTitle>
              <DialogDescription>Tudo o que você encontra aqui:</DialogDescription>
            </DialogHeader>
            <ul className="grid gap-2">
              {MODULES.map((m) => (
                <li key={m.label} className="flex items-center gap-2 text-sm">
                  <m.icon className="h-4 w-4 text-muted-foreground" /> {m.label}
                </li>
              ))}
            </ul>
            <div className="flex justify-between gap-2">
              <Button variant="ghost" onClick={() => setStep(0)}>
                Voltar
              </Button>
              <Button onClick={() => setStep(2)}>Continuar</Button>
            </div>
          </>
        ) : (
          <>
            <DialogHeader>
              <DialogTitle>Começar a jornada</DialogTitle>
              <DialogDescription>Seus próximos passos:</DialogDescription>
            </DialogHeader>
            <ol className="list-inside list-decimal space-y-1 text-sm text-muted-foreground">
              <li>Completar seu perfil</li>
              <li>Conhecer o grupo do WhatsApp</li>
              <li>Assistir ao vídeo de boas-vindas</li>
              <li>Apresentar-se para a comunidade</li>
            </ol>
            <Button className="w-full" onClick={() => close(true)} disabled={pending}>
              {pending ? "Abrindo…" : "Começar agora"}
            </Button>
          </>
        )}
      </DialogContent>
    </Dialog>
  );
}
