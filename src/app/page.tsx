import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  GraduationCap,
  Heart,
  Layers,
  LayoutGrid,
  MessageSquareText,
  Sparkles,
  Trophy,
  Users,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { Logo } from "@/components/shared/logo";

export const metadata = {
  title: "Nexus · Comunidade gratuita de Inteligência Artificial",
  description:
    "Entre de graça na Nexus: uma comunidade que ajuda você a aprender, aplicar e crescer com Inteligência Artificial. Cursos, mentorias, ferramentas e gente disposta a ajudar.",
};

function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <Card className="border-border bg-card/60 backdrop-blur transition-colors hover:border-[var(--accent-line)]">
      <CardContent className="space-y-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-muted text-[var(--accent)] ring-1 ring-[var(--accent-line)]">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default function LandingPage() {
  return (
    <div className="relative min-h-screen overflow-hidden bg-background text-foreground">
      <div
        aria-hidden
        className="pointer-events-none absolute inset-x-0 top-0 h-[520px]"
        style={{ background: "radial-gradient(60% 100% at 50% 0%, var(--accent-glow), transparent 70%)" }}
      />

      <header className="relative mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center">
          <Logo className="h-7 w-auto" priority />
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Participar grátis</Link>
          </Button>
        </div>
      </header>

      <main className="relative mx-auto max-w-6xl px-6">
        {/* HERO */}
        <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <Badge variant="outline" className="gap-1.5 border-[var(--accent-line)] text-[var(--accent)]">
              <Sparkles className="h-3 w-3" /> Comunidade gratuita de IA
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Aprenda e aplique <span className="text-[var(--accent)]">Inteligência Artificial</span> com
              uma comunidade que te ajuda.
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              A Nexus existe para ajudar quem quer entender e usar IA no dia a dia — não importa o seu nível.
              Cursos, mentorias, ferramentas e pessoas dispostas a ajudar. <strong className="text-foreground">Participar é gratuito.</strong>
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/register">
                  Participar gratuitamente <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Já sou membro</Link>
              </Button>
            </div>
            <p className="text-xs text-muted-foreground">100% gratuito · leva menos de 1 minuto · sem cartão</p>
          </div>

          <Card className="overflow-hidden border-[var(--accent-line)] bg-card/70 shadow-[0_0_50px_-12px_var(--accent-glow)] backdrop-blur">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="h-4 w-4 text-[var(--accent)]" />
                O que você encontra ao entrar
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <MessageSquareText className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                  <div>
                    <p className="font-medium">Comunidade que ajuda</p>
                    <p className="text-muted-foreground">Tire dúvidas e troque ideias com quem também está aprendendo IA.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                  <div>
                    <p className="font-medium">Cursos práticos</p>
                    <p className="text-muted-foreground">Trilhas do básico ao avançado, com progresso e aulas aplicadas.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <LayoutGrid className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                  <div>
                    <p className="font-medium">Ferramentas de IA</p>
                    <p className="text-muted-foreground">Apps e recursos reunidos num só lugar para você usar agora.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Calendar className="mt-0.5 h-4 w-4 text-[var(--accent)]" />
                  <div>
                    <p className="font-medium">Eventos e mentorias ao vivo</p>
                    <p className="text-muted-foreground">Lives, mentorias e desafios para acelerar seu aprendizado.</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        {/* FEATURES */}
        <section className="grid gap-4 py-12 md:grid-cols-3">
          <FeatureCard
            icon={Users}
            title="Ninguém aprende sozinho"
            description="Pergunte, responda e evolua junto. Uma comunidade ativa que se ajuda de verdade."
          />
          <FeatureCard
            icon={GraduationCap}
            title="IA na prática"
            description="Cursos e aulas aplicadas, com gamificação para você manter o ritmo e aprender fazendo."
          />
          <FeatureCard
            icon={Heart}
            title="Aberto e gratuito"
            description="Acreditamos que IA é para todos. Por isso a participação na comunidade é gratuita."
          />
        </section>

        {/* MISSÃO */}
        <section className="my-8 grid gap-6 rounded-2xl border border-border bg-card/40 p-8 md:grid-cols-[1.2fr_1fr] md:p-10">
          <div className="space-y-3">
            <Badge variant="outline" className="gap-1.5 border-[var(--accent-line)] text-[var(--accent)]">
              <Heart className="h-3 w-3" /> Nosso propósito
            </Badge>
            <h2 className="text-2xl font-semibold tracking-tight">
              Ajudar pessoas no mundo todo a crescer com Inteligência Artificial.
            </h2>
            <p className="text-sm text-muted-foreground">
              A IA está mudando tudo — e ninguém deveria ficar para trás por falta de acesso ou de ajuda.
              A Nexus reúne conteúdo, ferramentas e uma comunidade acolhedora para que qualquer pessoa
              possa aprender, aplicar e prosperar com IA. De graça.
            </p>
          </div>
          <div className="flex flex-col justify-center gap-3 rounded-xl border border-[var(--accent-line)] bg-background/40 p-5">
            <p className="text-sm font-medium">Pronto para fazer parte?</p>
            <p className="text-sm text-muted-foreground">Sua vaga é gratuita. Entre e comece hoje.</p>
            <Button asChild className="gap-2">
              <Link href="/register">
                Quero participar <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>

        {/* CTA FINAL */}
        <section className="my-16 overflow-hidden rounded-2xl border border-[var(--accent-line)] bg-card p-10 text-center shadow-[0_0_60px_-20px_var(--accent-glow)]">
          <div className="mx-auto max-w-xl space-y-4">
            <Trophy className="mx-auto h-8 w-8 text-[var(--accent)]" />
            <h2 className="text-2xl font-semibold tracking-tight">Entre gratuitamente na comunidade Nexus</h2>
            <p className="text-sm text-muted-foreground">
              Crie sua conta em segundos e comece a aprender, aplicar e trocar sobre IA com gente que quer te ajudar.
            </p>
            <Button asChild size="lg" className="gap-2">
              <Link href="/register">
                Participar agora — é grátis <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="relative border-t border-border bg-background/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-xs text-muted-foreground md:flex-row">
          <p>Nexus HUB · {new Date().getFullYear()}</p>
          <p>Criado por Iago Amorim Dias</p>
        </div>
      </footer>
    </div>
  );
}
