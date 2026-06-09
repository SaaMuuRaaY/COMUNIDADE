import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  GraduationCap,
  Hexagon,
  Layers,
  LayoutGrid,
  MessageSquareText,
  Sparkles,
  Trophy,
  type LucideIcon,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Card, CardContent } from "@/components/ui/card";
import { Badge } from "@/components/ui/badge";
import { createClient } from "@/lib/supabase/server";

function FeatureCard({ icon: Icon, title, description }: { icon: LucideIcon; title: string; description: string }) {
  return (
    <Card className="border-zinc-200/60 bg-white/50 backdrop-blur dark:border-zinc-800/60 dark:bg-zinc-900/40">
      <CardContent className="space-y-3 p-6">
        <div className="flex h-10 w-10 items-center justify-center rounded-md bg-zinc-900 text-zinc-50 dark:bg-zinc-50 dark:text-zinc-900">
          <Icon className="h-5 w-5" />
        </div>
        <h3 className="text-base font-semibold">{title}</h3>
        <p className="text-sm text-muted-foreground">{description}</p>
      </CardContent>
    </Card>
  );
}

export default async function LandingPage() {
  let latestPosts: { id: string; title: string | null; body: string; created_at: string }[] = [];
  let latestCourses: { id: string; title: string; description: string | null }[] = [];

  try {
    const supabase = await createClient();
    const [postsRes, coursesRes] = await Promise.all([
      supabase
        .from("posts")
        .select("id, title, body, created_at")
        .eq("is_deleted", false)
        .order("created_at", { ascending: false })
        .limit(3),
      supabase
        .from("courses")
        .select("id, title, description")
        .eq("status", "published")
        .order("order_index")
        .limit(3),
    ]);
    latestPosts = postsRes.data ?? [];
    latestCourses = coursesRes.data ?? [];
  } catch {
    // Supabase indisponível durante o build estático — segue sem dados públicos.
  }

  return (
    <div className="min-h-screen bg-gradient-to-b from-white via-zinc-50 to-zinc-100 dark:from-zinc-950 dark:via-zinc-950 dark:to-black">
      <header className="mx-auto flex max-w-6xl items-center justify-between px-6 py-6">
        <Link href="/" className="flex items-center gap-2 text-lg font-semibold">
          <Hexagon className="h-6 w-6" />
          CODEX Community
        </Link>
        <div className="flex items-center gap-2">
          <Button asChild variant="ghost">
            <Link href="/login">Entrar</Link>
          </Button>
          <Button asChild>
            <Link href="/register">Criar conta</Link>
          </Button>
        </div>
      </header>

      <main className="mx-auto max-w-6xl px-6">
        <section className="grid items-center gap-10 py-16 md:grid-cols-2 md:py-24">
          <div className="space-y-6">
            <Badge variant="secondary" className="gap-1">
              <Sparkles className="h-3 w-3" /> Plataforma própria · em beta
            </Badge>
            <h1 className="text-4xl font-semibold leading-tight tracking-tight md:text-5xl">
              Sua comunidade.
              <br />
              Seus cursos.
              <br />
              <span className="text-muted-foreground">Sob seu controle.</span>
            </h1>
            <p className="max-w-md text-base text-muted-foreground">
              Comunidade, área de membros, cursos, vídeos, biblioteca de recursos e apps —
              tudo numa única plataforma. Sem depender de Skool, Discord ou redes sociais.
            </p>
            <div className="flex flex-wrap gap-3">
              <Button asChild size="lg" className="gap-2">
                <Link href="/register">
                  Começar agora <ArrowRight className="h-4 w-4" />
                </Link>
              </Button>
              <Button asChild size="lg" variant="outline">
                <Link href="/login">Já tenho conta</Link>
              </Button>
            </div>
          </div>

          <Card className="overflow-hidden border-zinc-200 shadow-xl dark:border-zinc-800">
            <CardContent className="space-y-5 p-6">
              <div className="flex items-center gap-2 text-sm text-muted-foreground">
                <Layers className="h-4 w-4" />
                Tudo num só lugar
              </div>
              <ul className="space-y-3 text-sm">
                <li className="flex items-start gap-3">
                  <MessageSquareText className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Feed e fóruns</p>
                    <p className="text-muted-foreground">Publicações, dúvidas e debates por categoria.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <GraduationCap className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Classroom completo</p>
                    <p className="text-muted-foreground">Cursos com módulos, aulas em vídeo e progresso.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <LayoutGrid className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Biblioteca de apps</p>
                    <p className="text-muted-foreground">Centralize as ferramentas que sua comunidade usa.</p>
                  </div>
                </li>
                <li className="flex items-start gap-3">
                  <Trophy className="mt-0.5 h-4 w-4 text-muted-foreground" />
                  <div>
                    <p className="font-medium">Gamificação que engaja</p>
                    <p className="text-muted-foreground">Pontos, níveis e leaderboard simples e eficaz.</p>
                  </div>
                </li>
              </ul>
            </CardContent>
          </Card>
        </section>

        <section className="grid gap-4 py-12 md:grid-cols-3">
          <FeatureCard
            icon={MessageSquareText}
            title="Comunidade real"
            description="Posts, comentários, curtidas, categorias e filtros. Engajamento sem distração."
          />
          <FeatureCard
            icon={GraduationCap}
            title="Cursos com vídeo"
            description="Estrutura módulo → aula, vídeos hospedados, progresso por membro."
          />
          <FeatureCard
            icon={Calendar}
            title="Eventos e mentorias"
            description="Lives, mentorias, desafios e RSVP — tudo no calendário da comunidade."
          />
        </section>

        {latestCourses.length > 0 ? (
          <section className="space-y-4 py-10">
            <h2 className="text-xl font-semibold tracking-tight">Cursos em destaque</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {latestCourses.map((c) => (
                <Card key={c.id}>
                  <CardContent className="space-y-2 p-5">
                    <h3 className="font-medium">{c.title}</h3>
                    <p className="line-clamp-3 text-sm text-muted-foreground">
                      {c.description ?? "Conteúdo prático e direto ao ponto."}
                    </p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        {latestPosts.length > 0 ? (
          <section className="space-y-4 py-10">
            <h2 className="text-xl font-semibold tracking-tight">O que está rolando</h2>
            <div className="grid gap-4 md:grid-cols-3">
              {latestPosts.map((p) => (
                <Card key={p.id}>
                  <CardContent className="space-y-2 p-5">
                    <h3 className="font-medium">{p.title ?? "Sem título"}</h3>
                    <p className="line-clamp-3 text-sm text-muted-foreground">{p.body}</p>
                  </CardContent>
                </Card>
              ))}
            </div>
          </section>
        ) : null}

        <section className="my-16 rounded-2xl border bg-zinc-950 p-10 text-zinc-100">
          <div className="space-y-4">
            <h2 className="text-2xl font-semibold tracking-tight">Pronto para construir sua comunidade?</h2>
            <p className="max-w-xl text-sm text-zinc-400">
              Crie sua conta em segundos e comece a engajar membros, lançar cursos e centralizar suas ferramentas.
            </p>
            <Button asChild size="lg" variant="secondary" className="gap-2">
              <Link href="/register">
                Criar conta agora <ArrowRight className="h-4 w-4" />
              </Link>
            </Button>
          </div>
        </section>
      </main>

      <footer className="border-t bg-background/60 py-6">
        <div className="mx-auto flex max-w-6xl flex-col items-center justify-between gap-2 px-6 text-xs text-muted-foreground md:flex-row">
          <p>CODEX Community · MVP · {new Date().getFullYear()}</p>
          <p>Construído sobre Next.js + Supabase</p>
        </div>
      </footer>
    </div>
  );
}
