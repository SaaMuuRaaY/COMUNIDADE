"use client";

import Link from "next/link";
import { usePathname } from "next/navigation";
import { cn } from "@/lib/utils";
import { NAV_TREE, navHref, isNavItemActive } from "@/lib/navigation";
import { NavIcon } from "./nav-icon";

type Variant = "sidebar" | "drawer";

const groupHeaderClass: Record<Variant, string> = {
  sidebar: "px-3 pb-1 text-[11px] font-medium uppercase tracking-wide text-sidebar-foreground/50",
  drawer: "px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground",
};

function linkClass(active: boolean, variant: Variant) {
  const base = "flex items-center gap-3 rounded-md text-sm transition-colors";
  if (variant === "sidebar") {
    return cn(
      base,
      "px-3 py-2",
      active
        ? "bg-[var(--accent-soft)] text-foreground font-medium ring-1 ring-inset ring-[var(--accent-line)]"
        : "text-sidebar-foreground/80 hover:bg-sidebar-accent hover:text-sidebar-accent-foreground",
    );
  }
  return cn(
    base,
    "px-2 py-2",
    active ? "bg-accent font-medium text-accent-foreground" : "hover:bg-accent",
  );
}

/**
 * Render compartilhado da árvore de navegação unificada (NAV_TREE), usado tanto
 * pela sidebar desktop quanto pelo drawer mobile — fonte única, sem duplicar o
 * markup. `onNavigate` fecha o drawer após o clique no mobile.
 */
export function NavTree({
  variant,
  onNavigate,
  unreadDm,
}: {
  variant: Variant;
  onNavigate?: () => void;
  unreadDm?: number;
}) {
  const pathname = usePathname();

  return (
    <>
      {NAV_TREE.map((group) => (
        <div key={group.label} className="flex flex-col gap-1">
          <p className={groupHeaderClass[variant]}>{group.label}</p>
          {group.items.map((item) => {
            const href = navHref(item);
            const active = isNavItemActive(pathname, item);
            return (
              <Link
                key={href}
                href={href}
                onClick={onNavigate}
                aria-current={active ? "page" : undefined}
                // Alvo estável do tour guiado. Presente na sidebar E no drawer:
                // o tour escolhe o elemento VISÍVEL, nunca o primeiro do DOM.
                data-tour={item.tour}
                className={linkClass(active, variant)}
              >
                <NavIcon id={item.icon} className="h-4 w-4 shrink-0" />
                <span className="truncate">{item.label}</span>
                {href === "/mensagens" && unreadDm && unreadDm > 0 ? (
                  <span className="ml-auto flex h-5 min-w-5 items-center justify-center rounded-full bg-[var(--accent)] px-1.5 text-[11px] font-medium text-white">
                    {unreadDm > 99 ? "99+" : unreadDm}
                  </span>
                ) : null}
              </Link>
            );
          })}
        </div>
      ))}
    </>
  );
}
