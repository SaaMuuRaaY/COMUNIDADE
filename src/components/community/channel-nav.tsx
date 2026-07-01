"use client";

import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { cn } from "@/lib/utils";
import { listGroupsWithChannels } from "@/lib/community/structure";
import { ChannelIcon } from "./channel-icon";

const GROUPS = listGroupsWithChannels();

/** Nav vertical de canais (desktop). */
export function ChannelNav() {
  const pathname = usePathname();
  return (
    <nav aria-label="Canais da comunidade" className="flex flex-col gap-4">
      {GROUPS.map(({ group, channels }) => (
        <div key={group.slug} className="flex flex-col gap-0.5">
          <p className="px-2 pb-1 text-[11px] font-medium uppercase tracking-wide text-muted-foreground">
            {group.label}
          </p>
          {channels.map((ch) => {
            const href = `/community/c/${ch.slug}`;
            const active = pathname === href;
            return (
              <Link
                key={ch.slug}
                href={href}
                aria-current={active ? "page" : undefined}
                className={cn(
                  "flex items-center gap-2 rounded-md px-2 py-1.5 text-sm transition-colors",
                  active
                    ? "bg-[var(--accent-soft)] font-medium text-foreground"
                    : "text-muted-foreground hover:bg-accent hover:text-foreground",
                )}
              >
                <ChannelIcon id={ch.icon} className="h-4 w-4 shrink-0" />
                <span className="truncate">{ch.label}</span>
              </Link>
            );
          })}
        </div>
      ))}
    </nav>
  );
}

/** Seletor de canal agrupado (mobile). */
export function ChannelSelectMobile() {
  const pathname = usePathname();
  const router = useRouter();
  const current = pathname.startsWith("/community/c/")
    ? pathname.slice("/community/c/".length)
    : "";
  return (
    <label className="block">
      <span className="sr-only">Selecionar canal</span>
      <select
        value={current}
        onChange={(e) => router.push(`/community/c/${e.target.value}`)}
        className="w-full rounded-md border bg-background px-3 py-2 text-sm"
      >
        {current === "" ? <option value="">Escolher canal…</option> : null}
        {GROUPS.map(({ group, channels }) => (
          <optgroup key={group.slug} label={group.label}>
            {channels.map((ch) => (
              <option key={ch.slug} value={ch.slug}>
                {ch.label}
              </option>
            ))}
          </optgroup>
        ))}
      </select>
    </label>
  );
}
