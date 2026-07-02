"use client";

import { Settings, Sun, Moon, Check } from "lucide-react";
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetDescription,
  SheetTrigger,
} from "@/components/ui/sheet";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { useTweaks } from "./theme";
import { ACCENT_PRESETS, type StyleMode, type ThemeMode, type Density } from "./theme-constants";

const STYLES: { value: StyleMode; label: string; hint: string }[] = [
  { value: "refined", label: "Refined", hint: "Escuro sóbrio" },
  { value: "cyberpunk", label: "Cyberpunk", hint: "Neon" },
  { value: "terminal", label: "Terminal", hint: "Mono" },
];

function Section({ title, children }: { title: string; children: React.ReactNode }) {
  return (
    <div className="space-y-2">
      <p className="text-xs font-medium uppercase tracking-wide text-muted-foreground">{title}</p>
      {children}
    </div>
  );
}

function Choice({
  active,
  onClick,
  children,
}: {
  active: boolean;
  onClick: () => void;
  children: React.ReactNode;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-pressed={active}
      className={cn(
        "flex items-center justify-center gap-1.5 rounded-md border px-3 py-2 text-sm transition-colors",
        active
          ? "border-[var(--accent)] bg-[var(--accent)] text-[var(--accent-fg)] font-medium"
          : "border-border text-muted-foreground hover:bg-accent hover:text-foreground",
      )}
    >
      {children}
    </button>
  );
}

/**
 * Drawer de aparência. Sem props → botão-ícone próprio (uso legado).
 * Com `open`/`onOpenChange` (+ `hideTrigger`) → modo controlado, para ser
 * acionado de fora, ex.: item "Configurações visuais" no menu do avatar.
 */
export function ThemeSettings({
  open,
  onOpenChange,
  hideTrigger = false,
}: {
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  hideTrigger?: boolean;
} = {}) {
  const { tweaks, setTweak } = useTweaks();
  const controlled = open !== undefined;

  return (
    <Sheet open={controlled ? open : undefined} onOpenChange={onOpenChange}>
      {hideTrigger ? null : (
        <SheetTrigger asChild>
          <Button variant="ghost" size="icon" aria-label="Aparência">
            <Settings className="h-5 w-5" />
          </Button>
        </SheetTrigger>
      )}
      <SheetContent side="right" className="w-80 sm:max-w-sm">
        <SheetHeader>
          <SheetTitle>Aparência</SheetTitle>
          <SheetDescription>Ajuste tema, estilo e cor de destaque. Salvo neste navegador.</SheetDescription>
        </SheetHeader>

        <div className="mt-6 space-y-6">
          <Section title="Tema">
            <div className="grid grid-cols-2 gap-2">
              <Choice active={tweaks.theme === "dark"} onClick={() => setTweak("theme", "dark" as ThemeMode)}>
                <Moon className="h-4 w-4" /> Escuro
              </Choice>
              <Choice active={tweaks.theme === "light"} onClick={() => setTweak("theme", "light" as ThemeMode)}>
                <Sun className="h-4 w-4" /> Claro
              </Choice>
            </div>
          </Section>

          <Section title="Estilo">
            <div className="grid grid-cols-3 gap-2">
              {STYLES.map((s) => (
                <Choice key={s.value} active={tweaks.style === s.value} onClick={() => setTweak("style", s.value)}>
                  {s.label}
                </Choice>
              ))}
            </div>
          </Section>

          <Section title="Cor de destaque">
            <div className="grid grid-cols-2 gap-2">
              {ACCENT_PRESETS.map((p) => {
                const active = tweaks.accentH === p.value;
                return (
                  <button
                    key={p.value}
                    type="button"
                    onClick={() => setTweak("accentH", p.value)}
                    aria-pressed={active}
                    className={cn(
                      "flex items-center gap-2 rounded-md border px-3 py-2 text-sm transition-colors",
                      active ? "border-[var(--accent)] bg-[var(--accent-soft)]" : "border-border hover:bg-accent",
                    )}
                  >
                    <span
                      className="h-4 w-4 shrink-0 rounded-full ring-1 ring-black/20"
                      style={{ background: `oklch(0.72 0.2 ${p.value})` }}
                    />
                    <span className="truncate">{p.label}</span>
                    {active ? <Check className="ml-auto h-3.5 w-3.5 text-[var(--accent)]" /> : null}
                  </button>
                );
              })}
            </div>
          </Section>

          <Section title="Densidade">
            <div className="grid grid-cols-2 gap-2">
              <Choice
                active={tweaks.density === "comfortable"}
                onClick={() => setTweak("density", "comfortable" as Density)}
              >
                Confortável
              </Choice>
              <Choice active={tweaks.density === "compact"} onClick={() => setTweak("density", "compact" as Density)}>
                Compacto
              </Choice>
            </div>
          </Section>
        </div>
      </SheetContent>
    </Sheet>
  );
}
