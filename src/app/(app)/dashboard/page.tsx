import Link from "next/link";
import {
  ArrowRight,
  Calendar,
  GraduationCap,
  Library,
  LayoutGrid,
  MessageSquareText,
  Sparkles,
  Trophy,
  User,
} from "lucide-react";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Progress } from "@/components/ui/progress";
import { Badge } from "@/components/ui/badge";
import { EmptyState } from "@/components/shared/empty-state";
import { UserAvatar } from "@/components/shared/user-avatar";
import { requireProfile } from "@/lib/auth/current-user";
import { createClient } from "@/lib/supabase/server";
import { getDashboardData } from "@/server/queries/dashboard";
import { getSettings } from "@/server/queries/settings";
import { settingString, settingBoolean } from "@/lib/config/settings";
import { shouldShowInvite } from "@/lib/whatsapp/invite";
import { WhatsAppInvite } from "@/components/whatsapp/whatsapp-invite";
import { needsOnboarding as journeyNeedsOnboarding } from "@/lib/onboarding/journey";
import { WelcomeTour } from "@/components/onboarding/welcome-tour";
import { OnboardingBanner } from "@/components/onboarding/onboarding-banner";
import { nextLevelThreshold } from "@/lib/constants";
import { getCategoryLabel, getChannel, channelHref } from "@/lib/community/structure";
import { ChannelIcon } from "@/components/community/channel-icon";
import { formatRelative } from "@/lib/utils";

export const metadata = { title: "Início" };

const SHORTCUTS = [
  { href: "/community", label: "Comunidade", icon: MessageSquareText },
  { href: "/courses", label: "Cursos", icon: GraduationCap },
  { href: "/resources", label: "Recursos", icon: Library },
  { href: "/apps", label: "Apps", icon: LayoutGrid },
  { href: "/calendar", label: "Calendário", icon: Calendar },
  { href: "/profile", label: "Perfil", icon: User },
];

const FEATURED_CHANNELS = [
  "comece-por-aqui",
  "apresente-se",
  "chat-networking",
  "duvidas-gerais",
  "vagas-oportunidades",
  "comunicados",
];

export default async function DashboardPage() {
  const profile = await requireProfile();
  const data = await getDashboardData(profile.id);

  const supabase = await createClient();
  const { data: onboarding, error: onboardingError } = await supabase
    .from("member_onboarding")
    .select(
      "completed_at, grandfathered_at, welcome_tour_completed_at, whatsapp_invite_first_shown_at, whatsapp_invite_show_count, whatsapp_joined_claimed_at, whatsapp_invite_dismissed_at",
    )
    .eq("user_id", profile.id)
    .maybeSingle();
  // needsOnboarding respeita grandfathered_at (usuário antigo não é incomodado).
  // Na dúvida (erro de query) não incomoda quem talvez já tenha completado.
  const onNeedsOnboarding = !onboardingError && journeyNeedsOnboarding(onboarding ?? null);
  // Pop-up de boas-vindas: 1º acesso de quem está na jornada e ainda não viu o tour.
  const showWelcomeTour = onNeedsOnboarding && !onboarding?.welcome_tour_completed_at;

  // Convite ao grupo do WhatsApp: só para quem concluiu o onboarding, respeitando
  // o cooldown (0 / +7d / +21d). Config global no Admin (settings). O popup só
  // aparece com o convite ativado e uma URL definida.
  const settings = await getSettings();
  const waUrl = settingString(settings, "whatsapp_invite.url");
  // eslint-disable-next-line react-hooks/purity
  const nowMs = Date.now();
  const showWhatsapp =
    settingBoolean(settings, "whatsapp_invite.enabled") &&
    !!waUrl &&
    !onboardingError &&
    !!onboarding &&
    shouldShowInvite(onboarding, nowMs);

  const nextThreshold = nextLevelThreshold(profile.points);
  const progressToNext = nextThreshold
    ? Math.min(100, Math.round(((profile.points / nextThreshold) * 100)))
    : 100;

  return (
    <div className="mx-auto max-w-6xl space-y-6 p-4 md:p-6">
      <WelcomeTour show={showWelcomeTour} />
      {onNeedsOnboarding ? <OnboardingBanner /> : null}
      {showWhatsapp && waUrl ? (
        <WhatsAppInvite
          url={waUrl}
          title={settingString(settings, "whatsapp_invite.title") ?? "Convite exclusivo"}
          description={
            settingString(settings, "whatsapp_invite.description") ??
            "Entre no grupo oficial da comunidade no WhatsApp para receber avisos, participar das conversas e acompanhar as principais novidades."
          }
        />
      ) : null}
      <section className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div className="flex items-center gap-3">
          <UserAvatar name={profile.full_name} src={profile.avatar_url} className="h-14 w-14" />
          <div>
            <h1 className="text-2xl font-semibold tracking-tight">
              Olá, {profile.full_name?.split(" ")[0] ?? "membro"} 👋
            </h1>
            <p className="text-sm text-muted-foreground">
              {profile.points} pontos · Nível {profile.level}
              {nextThreshold ? ` · faltam ${nextThreshold - profile.points} pts p/ Nv ${profile.level + 1}` : " · nível máximo"}
            </p>
          </div>
        </div>
        <div className="w-full md:w-64">
          <Progress value={progressToNext} />
        </div>
      </section>

      <section className="grid gap-3 sm:grid-cols-3 md:grid-cols-6">
        {SHORTCUTS.map((s) => (
          <Link key={s.href} href={s.href}>
            <Card className="transition-colors hover:bg-accent">
              <CardContent className="flex items-center gap-3 p-4">
                <div className="flex h-9 w-9 items-center justify-center rounded-md bg-muted text-[var(--accent)] ring-1 ring-inset ring-[var(--accent-line)]">
                  <s.icon className="h-4 w-4" />
                </div>
                <div className="text-sm font-medium">{s.label}</div>
              </CardContent>
            </Card>
          </Link>
        ))}
      </section>

      <section>
        <div className="mb-2 flex items-center justify-between">
          <h2 className="text-sm font-medium text-muted-foreground">Canais da comunidade</h2>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/community">
              Ver todos <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </div>
        <div className="flex flex-wrap gap-2">
          {FEATURED_CHANNELS.map((slug) => {
            const ch = getChannel(slug);
            if (!ch) return null;
            return (
              <Link
                key={slug}
                href={channelHref(slug) ?? "/community"}
                className="inline-flex items-center gap-2 rounded-full border px-3 py-1.5 text-sm transition-colors hover:bg-accent"
              >
                <ChannelIcon id={ch.icon} className="h-4 w-4 text-[var(--accent)]" />
                {ch.label}
              </Link>
            );
          })}
        </div>
      </section>

      <div className="grid gap-6 lg:grid-cols-3">
        <Card className="lg:col-span-2">
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Cursos em andamento</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/courses">
                Ver todos <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent>
            {data.courses.length === 0 ? (
              <EmptyState
                icon={GraduationCap}
                title="Sem cursos por enquanto"
                description="Quando houver cursos publicados, eles aparecem aqui."
              />
            ) : (
              <div className="grid gap-3 sm:grid-cols-2">
                {data.courses.map((c) => {
                  const completed = data.completedLessonsByCourse[c.id] ?? 0;
                  return (
                    <Link key={c.id} href={`/courses/${c.id}`}>
                      <Card className="h-full transition-colors hover:bg-accent">
                        <CardContent className="space-y-2 p-4">
                          <Badge variant="secondary" className="text-[10px]">
                            {completed} aulas concluídas
                          </Badge>
                          <p className="font-medium">{c.title}</p>
                        </CardContent>
                      </Card>
                    </Link>
                  );
                })}
              </div>
            )}
          </CardContent>
        </Card>

        <Card>
          <CardHeader className="flex flex-row items-center justify-between space-y-0">
            <CardTitle className="text-base">Próximos eventos</CardTitle>
            <Button asChild variant="ghost" size="sm" className="gap-1">
              <Link href="/calendar">
                Calendário <ArrowRight className="h-3 w-3" />
              </Link>
            </Button>
          </CardHeader>
          <CardContent className="space-y-3">
            {data.events.length === 0 ? (
              <EmptyState icon={Calendar} title="Nenhum evento agendado" />
            ) : (
              data.events.map((e) => (
                <div key={e.id} className="rounded-md border p-3">
                  <p className="text-xs uppercase tracking-wide text-muted-foreground">
                    {new Date(e.starts_at).toLocaleString("pt-BR", {
                      day: "2-digit",
                      month: "2-digit",
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </p>
                  <p className="font-medium">{e.title}</p>
                  <p className="text-xs text-muted-foreground">{e.event_type}</p>
                </div>
              ))
            )}
          </CardContent>
        </Card>
      </div>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Últimas publicações</CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/community">
              Ir para feed <ArrowRight className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          {data.posts.length === 0 ? (
            <EmptyState
              icon={MessageSquareText}
              title="O feed está calmo"
              description="Seja a primeira pessoa a publicar."
              action={
                <Button asChild>
                  <Link href="/community">Publicar agora</Link>
                </Button>
              }
            />
          ) : (
            <div className="divide-y">
              {data.posts.map((p) => {
                const author = Array.isArray(p.profiles) ? p.profiles[0] : p.profiles;
                return (
                  <Link
                    key={p.id}
                    href={`/post/${p.id}`}
                    className="flex items-start gap-3 py-3 hover:bg-accent"
                  >
                    <UserAvatar
                      name={author?.full_name as string | null | undefined}
                      src={author?.avatar_url as string | null | undefined}
                      className="h-8 w-8"
                    />
                    <div className="min-w-0 flex-1">
                      <div className="flex items-center gap-2 text-xs text-muted-foreground">
                        <span>{author?.full_name ?? "Membro"}</span>
                        <span>·</span>
                        <span>{formatRelative(p.created_at)}</span>
                        <Badge variant="outline" className="text-[10px]">{getCategoryLabel(p.category as string)}</Badge>
                      </div>
                      <p className="line-clamp-2 text-sm">{p.title ?? p.body}</p>
                    </div>
                  </Link>
                );
              })}
            </div>
          )}
        </CardContent>
      </Card>

      <Card>
        <CardHeader className="flex flex-row items-center justify-between space-y-0">
          <CardTitle className="text-base">Sua pontuação</CardTitle>
          <Button asChild variant="ghost" size="sm" className="gap-1">
            <Link href="/leaderboard">
              Ranking <Trophy className="h-3 w-3" />
            </Link>
          </Button>
        </CardHeader>
        <CardContent>
          <div className="flex items-center gap-3">
            <Badge variant="default" className="gap-1">
              <Sparkles className="h-3 w-3" /> Nv {profile.level}
            </Badge>
            <span className="text-2xl font-semibold">{profile.points}</span>
            <span className="text-sm text-muted-foreground">pontos</span>
          </div>
          <p className="mt-2 text-sm text-muted-foreground">
            Ganhe pontos publicando, comentando, concluindo aulas e participando de eventos.
          </p>
        </CardContent>
      </Card>
    </div>
  );
}
