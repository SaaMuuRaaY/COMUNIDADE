"use client";

import * as React from "react";
import { ChevronDown } from "lucide-react";
import { cn } from "@/lib/utils";

/**
 * Disclosure expansivel simples, SEM dependencia nova (nao usa Radix accordion).
 * Acessivel: <button> + aria-expanded. Usado em FAQ, acordos e onboarding.
 */
export function Collapsible({
  title,
  defaultOpen = false,
  className,
  children,
}: {
  title: React.ReactNode;
  defaultOpen?: boolean;
  className?: string;
  children: React.ReactNode;
}) {
  const [open, setOpen] = React.useState(defaultOpen);
  return (
    <div className={cn("rounded-lg border", className)}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className="flex w-full items-center justify-between gap-2 p-4 text-left text-sm font-medium"
      >
        {title}
        <ChevronDown
          className={cn(
            "h-4 w-4 shrink-0 text-muted-foreground transition-transform",
            open && "rotate-180",
          )}
        />
      </button>
      {open ? <div className="px-4 pb-4 text-sm text-muted-foreground">{children}</div> : null}
    </div>
  );
}
