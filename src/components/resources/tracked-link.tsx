"use client";

import * as React from "react";
import { incrementResourceClick, incrementAppClick } from "@/server/actions/resources-apps-events";

/**
 * Link externo que conta o clique INTENCIONAL (Baixar/Acessar/Abrir) — fire-and-
 * forget: dispara a RPC atômica e deixa o browser seguir o link. A falha da
 * métrica NUNCA bloqueia o acesso (não await, não bloqueia a navegação).
 */
export function TrackedLink({
  kind,
  id,
  href,
  className,
  children,
}: {
  kind: "resource" | "app";
  id: string;
  href: string;
  className?: string;
  children: React.ReactNode;
}) {
  // Defesa em profundidade: nao renderiza o <a> se o protocolo for perigoso
  // (javascript:/data:), mesmo que algum dado antigo tenha escapado do schema.
  let safe = false;
  try {
    safe = ["http:", "https:"].includes(new URL(href).protocol);
  } catch {
    safe = false;
  }
  if (!safe) return <span className={className}>{children}</span>;

  return (
    <a
      href={href}
      target="_blank"
      rel="noopener noreferrer"
      className={className}
      onClick={() => {
        void (kind === "resource" ? incrementResourceClick(id) : incrementAppClick(id));
      }}
    >
      {children}
    </a>
  );
}
