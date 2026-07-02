import type { ReactNode } from "react";

// Fase 6.5 — Unificação da navegação: o painel interno de canais (segunda
// sidebar) foi REMOVIDO. A navegação de canais vive agora na sidebar única
// (src/lib/navigation.ts). O feed ocupa toda a área útil; o cabeçalho de cada
// canal é renderizado dentro do próprio conteúdo (c/[channel]/page.tsx).
export default function CommunityLayout({ children }: { children: ReactNode }) {
  return <>{children}</>;
}
