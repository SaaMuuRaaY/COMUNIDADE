"use client";

import * as React from "react";
import Link from "next/link";
import type { LucideIcon } from "lucide-react";
import { Popover, PopoverContent, PopoverTrigger } from "@/components/ui/popover";
import { Button } from "@/components/ui/button";

/**
 * Ícone do header que abre um painel rápido (popover): prévia + badge de contagem
 * + rodapé "ver tudo". Reusável por Conversas / Notificações / Conexões (FEATURE 04).
 * O conteúdo (children) só monta quando o popover abre (PopoverContent lazy),
 * então a lista carrega on-open — o layout server só entrega a CONTAGEM (badge).
 */
export function HeaderPanel({
  icon: Icon,
  label,
  count,
  href,
  footerLabel,
  children,
}: {
  icon: LucideIcon;
  label: string;
  count?: number;
  href: string;
  footerLabel: string;
  children: React.ReactNode;
}) {
  return (
    <Popover>
      <PopoverTrigger asChild>
        <Button variant="ghost" size="icon" aria-label={label} className="relative">
          <Icon className="h-5 w-5" />
          {count && count > 0 ? (
            <span className="absolute -right-0.5 -top-0.5 flex h-4 min-w-4 items-center justify-center rounded-full bg-[var(--accent)] px-1 text-[10px] font-medium text-white">
              {count > 99 ? "99+" : count}
            </span>
          ) : null}
        </Button>
      </PopoverTrigger>
      <PopoverContent align="end" className="w-80 p-0">
        <div className="max-h-96 overflow-y-auto">{children}</div>
        <Link
          href={href}
          className="block border-t p-2.5 text-center text-sm font-medium text-[var(--accent)] hover:underline"
        >
          {footerLabel}
        </Link>
      </PopoverContent>
    </Popover>
  );
}
