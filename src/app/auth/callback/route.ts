import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { safeNextPath } from "@/lib/auth/safe-next-path";

export async function GET(request: NextRequest) {
  const { searchParams, origin } = new URL(request.url);
  const code = searchParams.get("code");
  const next = safeNextPath(searchParams.get("next"));

  if (code) {
    const supabase = await createClient();
    const { error } = await supabase.auth.exchangeCodeForSession(code);
    if (!error) {
      // Confirmacao de e-mail / OAuth: se o usuario ainda nao concluiu o onboarding,
      // passa por ele ANTES do destino (robusto — nao depende de query aninhada
      // sobreviver ao provedor). Ja-onboardado vai direto.
      let dest = next;
      const {
        data: { user },
      } = await supabase.auth.getUser();
      if (user && !next.startsWith("/onboarding")) {
        const { data: onb } = await supabase
          .from("member_onboarding")
          .select("completed_at")
          .eq("user_id", user.id)
          .maybeSingle();
        if (!onb?.completed_at) {
          dest = `/onboarding?next=${encodeURIComponent(next)}`;
        }
      }
      return NextResponse.redirect(`${origin}${dest}`);
    }
  }
  return NextResponse.redirect(`${origin}/login?error=auth`);
}
