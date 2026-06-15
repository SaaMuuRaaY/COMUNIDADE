"use client";

import * as React from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { Search } from "lucide-react";
import { Input } from "@/components/ui/input";
import { Button } from "@/components/ui/button";
import { POST_CATEGORIES } from "@/lib/constants";

export function FeedFilter() {
  const router = useRouter();
  const params = useSearchParams();
  const currentCategory = params.get("category") ?? "all";
  const currentSearch = params.get("q") ?? "";
  const [q, setQ] = React.useState(currentSearch);

  function setParam(key: string, value: string | null) {
    const sp = new URLSearchParams(params.toString());
    if (!value) sp.delete(key);
    else sp.set(key, value);
    router.push(`/community?${sp.toString()}`);
  }

  return (
    <div className="space-y-3">
      <form
        onSubmit={(e) => {
          e.preventDefault();
          setParam("q", q || null);
        }}
        className="flex items-center gap-2"
      >
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
          <Input
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder="Buscar publicações…"
            className="pl-9"
          />
        </div>
        <Button type="submit" variant="outline">
          Buscar
        </Button>
      </form>
      <div className="flex flex-wrap gap-2">
        <button
          onClick={() => setParam("category", null)}
          className={`rounded-full border px-3 py-1 text-xs ${
            currentCategory === "all"
              ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
              : "bg-background hover:bg-accent"
          }`}
        >
          Todas
        </button>
        {POST_CATEGORIES.map((c) => (
          <button
            key={c.value}
            onClick={() => setParam("category", c.value)}
            className={`rounded-full border px-3 py-1 text-xs ${
              currentCategory === c.value
                ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)]"
                : "bg-background hover:bg-accent"
            }`}
          >
            {c.label}
          </button>
        ))}
      </div>
    </div>
  );
}
