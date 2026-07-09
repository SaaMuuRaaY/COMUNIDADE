import { AI_LEVELS, ONBOARDING_GOALS, ONBOARDING_INTERESTS } from "@/lib/config/onboarding";

type IntroData = {
  ai_level: string | null;
  goals: string[] | null;
  interests: string[] | null;
  current_project: string | null;
};

function labelOf(list: readonly { value: string; label: string }[], value: string): string {
  return list.find((o) => o.value === value)?.label ?? value;
}

function labelsOf(list: readonly { value: string; label: string }[], values: string[] | null): string[] {
  return (values ?? []).map((v) => labelOf(list, v));
}

/**
 * Rascunho da apresentação a partir dos dados do onboarding — reduz o atrito da
 * primeira publicação e finalmente USA as informações coletadas. O membro edita
 * antes de publicar.
 */
export function buildIntroductionDraft(name: string, o: IntroData): string {
  const lines: string[] = [`Olá, sou ${name}.`];
  if (o.ai_level) {
    const level = labelOf(AI_LEVELS, o.ai_level).split("—")[0].trim();
    lines.push(`Meu nível atual com IA é ${level.toLowerCase()}.`);
  }
  if (o.current_project) lines.push(`Estou trabalhando em ${o.current_project}.`);
  const interests = labelsOf(ONBOARDING_INTERESTS, o.interests);
  if (interests.length) lines.push(`Quero aprender mais sobre ${interests.join(", ").toLowerCase()}.`);
  const goals = labelsOf(ONBOARDING_GOALS, o.goals);
  if (goals.length) lines.push(`Entrei na comunidade para ${goals.join(", ").toLowerCase()}.`);
  return lines.join("\n\n");
}
