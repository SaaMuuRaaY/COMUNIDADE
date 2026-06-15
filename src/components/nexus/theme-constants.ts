// Constantes/tipos compartilhados do motor de tema.
// SEM "use client": pode ser importado tanto por Client Components (theme.ts)
// quanto pelo layout (Server Component) — evita duplicar o BOOT_SCRIPT.

export type ThemeMode = "dark" | "light";
export type StyleMode = "refined" | "cyberpunk" | "terminal";
export type Density = "comfortable" | "compact";

export interface Tweaks {
  theme: ThemeMode;
  style: StyleMode;
  accentH: number;
  density: Density;
}

export const TWEAK_DEFAULTS: Tweaks = {
  theme: "dark",
  style: "refined",
  accentH: 200,
  density: "comfortable",
};

/** 4 hues OKLCH (só o hue muda; chroma/lightness vêm dos tokens). */
export const ACCENT_PRESETS: { value: number; label: string }[] = [
  { value: 200, label: "Azul Ciano" },
  { value: 300, label: "Roxo Cyberpunk" },
  { value: 145, label: "Verde Neon" },
  { value: 25, label: "Vermelho Hacker" },
];

export const STORAGE_KEY = "nexus.tweaks";

/**
 * Script de boot anti-flash. Injetar inline no <head> ANTES do CSS.
 * Lê o localStorage e aplica os data-attrs no <html> antes do primeiro paint.
 * Fonte única — usado pelo layout (Server) e exportado de theme.ts.
 */
export const BOOT_SCRIPT = `(function(){try{var d=${JSON.stringify(
  TWEAK_DEFAULTS,
)};var s=localStorage.getItem('${STORAGE_KEY}');var t=s?Object.assign({},d,JSON.parse(s)):d;var e=document.documentElement;e.dataset.style=t.style;e.dataset.theme=t.theme;e.dataset.density=t.density;e.style.setProperty('--accent-h',String(t.accentH));}catch(_){}})();`;
